// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title NutriChainEscrow
 * @dev Smart Contract untuk Escrow Payment dalam Program MBG (Makan Bergizi Gratis)
 *
 * FLOW PEMBAYARAN:
 * 1. Dinas/Pemerintah mengirim Dana ke contract (lock)
 * 2. Katering mengirim makanan ke sekolah
 * 3. Sekolah verifikasi penerimaan lewat backend
 * 4. Backend call releaseEscrow() → Dana cair ke Katering
 * 5. Event PaymentReleased dipantau backend → Update DB → Public Dashboard
 *
 * KEAMANAN:
 * - Hanya Admin/Payer bisa lock dana
 * - Hanya Backend Service Account bisa release
 * - Tidak bisa double-release (state check)
 * - Dana tidak pernah dipegang sekolah (escrow controlled)
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NutriChainEscrow is Ownable, ReentrancyGuard {

    // ============================================
    // STRUCT DEFINITIONS
    // ============================================

    /**
     * @dev Allocation merepresentasikan 1 transaksi pembayaran untuk delivery
     * allocation_id = hash(schoolId + cateringId + date) untuk unique identifier
     */
    struct Allocation {
        bytes32 allocationId;      // Unique identifier dari backend
        address payer;             // Dinas/Pemerintah (pengirim dana)
        address payee;             // Katering (penerima dana)
        uint256 amount;            // Jumlah dana dalam Wei (minimal 18 desimal)
        uint256 lockedAt;          // Timestamp dana dikunci
        uint256 releasedAt;        // Timestamp dana dicairkan
        bool isLocked;             // Status apakah dana sudah di-lock
        bool isReleased;           // Status apakah dana sudah di-release
        string metadata;           // JSON string: {schoolId, deliveryCount, date}
    }

    /**
     * @dev PaymentRecord untuk tracking setiap pembayaran
     */
    struct PaymentRecord {
        bytes32 allocationId;
        address payee;
        uint256 amount;
        uint256 txTimestamp;
        bytes32 txHash;            // Tx hash dari release transaction
    }

    // ============================================
    // STATE VARIABLES
    // ============================================

    // Mapping untuk store allocations by allocationId
    mapping(bytes32 => Allocation) public allocations;

    // Mapping untuk simpan payment records (untuk audit trail)
    mapping(bytes32 => PaymentRecord) public paymentRecords;

    // Backend service account yang authorized untuk release escrow
    address public backendServiceAccount;

    // Admin payer (Dinas/Pemerintah) - bisa multiple
    mapping(address => bool) public authorizedPayers;

    // Total dana yang terkunci di contract
    uint256 public totalLockedFunds;

    // Total dana yang sudah di-release
    uint256 public totalReleasedFunds;

    // ============================================
    // EVENTS
    // ============================================

    /**
     * Event ini di-emit saat Pemerintah lock dana
     * Backend listener akan capture event ini dan simpan ke DB
     */
    event FundLocked(
        bytes32 indexed allocationId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        uint256 timestamp,
        string metadata
    );

    /**
     * Event ini di-emit saat Backend call releaseEscrow()
     * Menandakan dana sudah ditransfer ke Katering
     * Frontend/Dashboard akan listen event ini untuk update real-time
     */
    event PaymentReleased(
        bytes32 indexed allocationId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        uint256 timestamp,
        bytes32 txHash
    );

    event FundWithdrawn(
        bytes32 indexed allocationId,
        address indexed payee,
        uint256 amount,
        uint256 timestamp
    );

    event BackendServiceAccountUpdated(address indexed newAccount);
    event AuthorizedPayerAdded(address indexed payer);
    event AuthorizedPayerRemoved(address indexed payer);

    // ============================================
    // MODIFIERS
    // ============================================

    /**
     * @dev Hanya authorized payer (Dinas/Pemerintah) yang bisa lock dana
     */
    modifier onlyAuthorizedPayer() {
        require(
            authorizedPayers[msg.sender] || msg.sender == owner(),
            "Only authorized payers can lock funds"
        );
        _;
    }

    /**
     * @dev Hanya backend service account yang bisa release escrow
     * Mencegah sekolah atau pihak lain melepas dana sendiri
     */
    modifier onlyBackendService() {
        require(
            msg.sender == backendServiceAccount,
            "Only backend service account can release escrow"
        );
        _;
    }

    /**
     * @dev Hanya allocation yang sudah di-lock bisa di-release
     */
    modifier onlyLockedAllocation(bytes32 _allocationId) {
        require(
            allocations[_allocationId].isLocked,
            "Allocation must be locked first"
        );
        require(
            !allocations[_allocationId].isReleased,
            "Allocation already released"
        );
        _;
    }

    // ============================================
    // CONSTRUCTOR & SETUP
    // ============================================

    constructor(address _backendServiceAccount) {
        require(_backendServiceAccount != address(0), "Invalid backend address");
        backendServiceAccount = _backendServiceAccount;
        authorizedPayers[msg.sender] = true; // Owner is first authorized payer
    }

    /**
     * @dev Setup authorized payer (Dinas/Pemerintah)
     * Owner bisa add multiple payers
     */
    function setAuthorizedPayer(address _payer, bool _isAuthorized)
        external
        onlyOwner
    {
        require(_payer != address(0), "Invalid payer address");
        authorizedPayers[_payer] = _isAuthorized;

        if (_isAuthorized) {
            emit AuthorizedPayerAdded(_payer);
        } else {
            emit AuthorizedPayerRemoved(_payer);
        }
    }

    /**
     * @dev Update backend service account
     * Ini account yang authorized untuk call releaseEscrow()
     */
    function setBackendServiceAccount(address _newBackendAccount)
        external
        onlyOwner
    {
        require(_newBackendAccount != address(0), "Invalid backend address");
        backendServiceAccount = _newBackendAccount;
        emit BackendServiceAccountUpdated(_newBackendAccount);
    }

    // ============================================
    // CORE FUNCTIONS
    // ============================================

    /**
     * @dev STEP 1: Dinas/Pemerintah lock dana ke escrow
     *
     * FLOW:
     * 1. Dinas kirim eth ke function ini
     * 2. Contract menerima dan lock dana
     * 3. Emit FundLocked event
     * 4. Backend listener capture event → update DB allocations status=LOCKED
     * 5. Katering bisa lihat dana terkunci lewat GET /vendor/payments
     *
     * @param _payee Wallet address Katering (penerima dana)
     * @param _allocationId Unique identifier dari backend (hash)
     * @param _metadata JSON string dengan schoolId, deliveryDate, portions, dll
     */
    function lockFund(
        address _payee,
        bytes32 _allocationId,
        string calldata _metadata
    )
        external
        payable
        onlyAuthorizedPayer
        nonReentrant
    {
        require(_payee != address(0), "Invalid payee address");
        require(msg.value > 0, "Amount must be greater than 0");
        require(
            allocations[_allocationId].allocationId == bytes32(0),
            "Allocation already exists"
        );

        // Simpan allocation ke state
        allocations[_allocationId] = Allocation({
            allocationId: _allocationId,
            payer: msg.sender,
            payee: _payee,
            amount: msg.value,
            lockedAt: block.timestamp,
            releasedAt: 0,
            isLocked: true,
            isReleased: false,
            metadata: _metadata
        });

        // Update total locked funds
        totalLockedFunds += msg.value;

        // EMIT EVENT
        // Backend listener akan capture event ini dan:
        // 1. Update allocations table: status = LOCKED, tx_hash = txHash
        // 2. Notify Katering bahwa dana sudah terkunci
        emit FundLocked(
            _allocationId,
            msg.sender,
            _payee,
            msg.value,
            block.timestamp,
            _metadata
        );
    }

    /**
     * @dev STEP 2: Backend call ini setelah Sekolah konfirmasi penerimaan
     *
     * FLOW:
     * 1. Sekolah klik "Konfirmasi Penerimaan" di portal
     * 2. Backend terima request, cek role (harus sekolah), validate delivery
     * 3. Backend call releaseEscrow(allocationId) via wallet service
     * 4. Smart contract transfer dana ke Katering
     * 5. Emit PaymentReleased event
     * 6. Backend listener capture event → Update DB → Public Dashboard update
     *
     * SECURITY:
     * - Hanya backend service account yang bisa call function ini
     * - Validasi allocation sudah LOCKED tapi belum RELEASED
     * - Prevent re-entrancy attack dengan nonReentrant modifier
     *
     * @param _allocationId Allocation ID yang akan di-release
     */
    function releaseEscrow(bytes32 _allocationId)
        external
        onlyBackendService
        onlyLockedAllocation(_allocationId)
        nonReentrant
    {
        Allocation storage allocation = allocations[_allocationId];

        require(allocation.payee != address(0), "Invalid payee");

        // Simpan data untuk event
        address payee = allocation.payee;
        uint256 amount = allocation.amount;

        // Update state SEBELUM transfer (Checks-Effects-Interactions pattern)
        allocation.isReleased = true;
        allocation.releasedAt = block.timestamp;
        totalLockedFunds -= amount;
        totalReleasedFunds += amount;

        // Simpan payment record untuk audit
        paymentRecords[_allocationId] = PaymentRecord({
            allocationId: _allocationId,
            payee: payee,
            amount: amount,
            txTimestamp: block.timestamp,
            txHash: bytes32(uint256(uint160(tx.origin))) // Simplified tx hash
        });

        // Transfer dana ke Katering
        (bool success, ) = payable(payee).call{value: amount}("");
        require(success, "Transfer failed");

        // EMIT EVENT
        // Frontend/Dashboard akan subscribe ke event ini untuk:
        // 1. Update Katering: "Dana Anda sudah diterima Rp X"
        // 2. Update Public Dashboard: tambah record ke payment feed
        // 3. Update Status: COMPLETED
        emit PaymentReleased(
            _allocationId,
            allocation.payer,
            payee,
            amount,
            block.timestamp,
            bytes32(0)
        );
    }

    /**
     * @dev Emergency function: Batalkan allocation dan kembalikan dana ke payer
     * Hanya bisa dipanggil oleh owner (Dinas/Pemerintah)
     *
     * Use case: Ada issue dengan pengiriman, maka dana dikembalikan
     */
    function cancelAllocation(bytes32 _allocationId, string calldata _reason)
        external
        onlyOwner
        nonReentrant
    {
        Allocation storage allocation = allocations[_allocationId];

        require(allocation.isLocked, "Allocation not locked");
        require(!allocation.isReleased, "Allocation already released");

        address payer = allocation.payer;
        uint256 amount = allocation.amount;

        // Update state
        allocation.isReleased = true; // Mark as released tapi dengan status CANCELLED
        allocation.releasedAt = block.timestamp;
        totalLockedFunds -= amount;

        // Return dana ke payer
        (bool success, ) = payable(payer).call{value: amount}("");
        require(success, "Refund failed");
    }

    // ============================================
    // VIEW FUNCTIONS - Query State
    // ============================================

    /**
     * @dev Get allocation details
     */
    function getAllocation(bytes32 _allocationId)
        external
        view
        returns (Allocation memory)
    {
        return allocations[_allocationId];
    }

    /**
     * @dev Get payment record (setelah released)
     */
    function getPaymentRecord(bytes32 _allocationId)
        external
        view
        returns (PaymentRecord memory)
    {
        return paymentRecords[_allocationId];
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get statistics
     */
    function getStatistics()
        external
        view
        returns (
            uint256 locked,
            uint256 released,
            uint256 balance
        )
    {
        return (totalLockedFunds, totalReleasedFunds, address(this).balance);
    }

    // ============================================
    // RECEIVE & FALLBACK
    // ============================================

    /**
     * @dev Allow contract to receive ETH
     * Hanya bisa via lockFund() function, tidak bisa direct transfer
     */
    receive() external payable {
        revert("Use lockFund() function");
    }

    fallback() external payable {
        revert("Use lockFund() function");
    }
}
