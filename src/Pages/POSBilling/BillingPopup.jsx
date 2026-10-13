import { useEffect, useMemo, useRef } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { MdSms } from "react-icons/md";
import styles from "./BillingPopup.module.css";
import ThermalReceipt from "./ThermalReceipt";

const PAYMENT_OPTIONS = [
    { key: "cash", shortcut: "A", label: "Cash" },
    { key: "cheque", shortcut: "B", label: "Cheque" },
    { key: "sodexo", shortcut: "C", label: "Sodexo" },
    { key: "card", shortcut: "D", label: "Card" },
    { key: "upi", shortcut: "O", label: "UPI" },
    { key: "split", shortcut: "S", label: "Split Payment" },
];

function BillingPopup({
    items = [],
    customerName = "",
    customerPhone = "",

    summary,
    prevBalance = 0,

    paymentStatus,
    setPaymentStatus,

    paymentMethod,
    setPaymentMethod,

    receivedAmount,
    setReceivedAmount,

    cashAmount,
    setCashAmount,

    upiAmount,
    setUpiAmount,

    cardAmount,
    setCardAmount,

    redeemPoints,
    setRedeemPoints,

    availableLoyalty = 0,

    chequeDetails,
    setChequeDetails,

    upiDetails,
    setUpiDetails,

    cardDetails,
    setCardDetails,

    onClose,
    onConfirm,
    loading,
}) {
    const amountInputRef = useRef(null);

    const grandTotal = Number(summary?.grandTotal || 0);
    const loyaltyUsed = Math.min(
        Number(redeemPoints || 0),
        Number(availableLoyalty || 0),
        grandTotal
    );

    const payableAmount = Math.max(grandTotal - loyaltyUsed, 0);

    const totalReceived = useMemo(() => {
        if (paymentMethod === "split") {
            return (
                Number(cashAmount || 0) +
                Number(upiAmount || 0) +
                Number(cardAmount || 0)
            );
        }

        return Number(receivedAmount || 0);
    }, [
        paymentMethod,
        receivedAmount,
        cashAmount,
        upiAmount,
        cardAmount,
    ]);

    const pendingAmount = Math.max(payableAmount - totalReceived, 0);
    const balanceAmount = Math.max(totalReceived - payableAmount, 0);

    useEffect(() => {
        setTimeout(() => {
            amountInputRef.current?.focus();
            amountInputRef.current?.select();
        }, 100);
    }, [paymentMethod]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const key = event.key.toLowerCase();

            const option = PAYMENT_OPTIONS.find(
                (item) => item.shortcut.toLowerCase() === key
            );

            if (option) {
                event.preventDefault();
                handlePaymentSelect(option.key);
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
            }

            if (event.key === "F7") {
                event.preventDefault();
                handleConfirm();
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if (paymentStatus === "paid" && paymentMethod !== "split") {
            setReceivedAmount(payableAmount.toFixed(2));
        }
    }, [paymentStatus, paymentMethod, payableAmount]);

    const handlePaymentSelect = (method) => {
        setPaymentMethod(method);

        if (method !== "split") {
            setReceivedAmount("");
        }
    };

    const handleConfirm = () => {
        if (loading) return;

        if (Number(redeemPoints || 0) > Number(availableLoyalty || 0)) {
            return;
        }

        if (
            paymentStatus === "paid" &&
            totalReceived < payableAmount
        ) {
            return;
        }

        onConfirm();
    };

    const renderPaymentFields = () => {

        if (paymentMethod === "split") {
            return (
                <div className={styles.splitGrid}>
                    <label className={styles.fieldGroup}>
                        <span>Cash</span>
                        <input
                            ref={amountInputRef}
                            type="text"
                            min="0"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                        />
                    </label>

                    <label className={styles.fieldGroup}>
                        <span>UPI</span>
                        <input
                            type="text"
                            min="0"
                            value={upiAmount}
                            onChange={(e) => setUpiAmount(e.target.value)}
                        />
                    </label>

                    <label className={styles.fieldGroup}>
                        <span>Card</span>
                        <input
                            type="text"
                            min="0"
                            value={cardAmount}
                            onChange={(e) => setCardAmount(e.target.value)}
                        />
                    </label>
                </div>
            );
        }

        return (
            <>
                <label className={styles.fieldGroup}>
                    <span>Received Amount</span>
                    <input
                        ref={amountInputRef}
                        type="text"
                        min="0"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                    />
                </label>

                {paymentMethod === "cheque" && (
                    <div className={styles.detailGrid}>
                        <label className={styles.fieldGroup}>
                            <span>Cheque No</span>
                            <input
                                value={chequeDetails.chequeNo}
                                onChange={(e) =>
                                    setChequeDetails((prev) => ({
                                        ...prev,
                                        chequeNo: e.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label className={styles.fieldGroup}>
                            <span>Cheque Date</span>
                            <input
                                type="date"
                                value={chequeDetails.chequeDate}
                                onChange={(e) =>
                                    setChequeDetails((prev) => ({
                                        ...prev,
                                        chequeDate: e.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label className={styles.fieldGroup}>
                            <span>Bank Name</span>
                            <input
                                value={chequeDetails.bankName}
                                onChange={(e) =>
                                    setChequeDetails((prev) => ({
                                        ...prev,
                                        bankName: e.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label className={styles.fieldGroup}>
                            <span>Account Holder</span>
                            <input
                                value={chequeDetails.accountHolder}
                                onChange={(e) =>
                                    setChequeDetails((prev) => ({
                                        ...prev,
                                        accountHolder: e.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>
                )}

                {paymentMethod === "upi" && (
                    <div className={styles.detailGrid}>
                        <label className={styles.fieldGroup}>
                            <span>UPI ID</span>
                            <input
                                value={upiDetails.upiId}
                                onChange={(e) =>
                                    setUpiDetails((prev) => ({
                                        ...prev,
                                        upiId: e.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label className={styles.fieldGroup}>
                            <span>Transaction ID</span>
                            <input
                                value={upiDetails.transactionId}
                                onChange={(e) =>
                                    setUpiDetails((prev) => ({
                                        ...prev,
                                        transactionId: e.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>
                )}

                {(paymentMethod === "card" ||
                    paymentMethod === "debitCard") && (
                        <div className={styles.detailGrid}>
                            <label className={styles.fieldGroup}>
                                <span>Card Type</span>
                                <input
                                    value={cardDetails.cardType}
                                    onChange={(e) =>
                                        setCardDetails((prev) => ({
                                            ...prev,
                                            cardType: e.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label className={styles.fieldGroup}>
                                <span>Last 4 Digits</span>
                                <input
                                    maxLength={4}
                                    value={cardDetails.cardLast4}
                                    onChange={(e) =>
                                        setCardDetails((prev) => ({
                                            ...prev,
                                            cardLast4: e.target.value.replace(/\D/g, ""),
                                        }))
                                    }
                                />
                            </label>

                            <label className={styles.fieldGroup}>
                                <span>Approval Code</span>
                                <input
                                    value={cardDetails.approvalCode}
                                    onChange={(e) =>
                                        setCardDetails((prev) => ({
                                            ...prev,
                                            approvalCode: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                        </div>
                    )}
            </>
        );
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.tenderModal}>
                <div className={styles.titleBar}>
                    <span>Tender Screen</span>

                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <section className={styles.leftSection}>
                        <ThermalReceipt
                            items={items}
                            summary={summary}
                            customerName={customerName}
                            customerPhone={customerPhone}
                            paidAmount={totalReceived}
                            balanceAmount={balanceAmount}
                            preview={true}
                        />

                        <div className={styles.summaryList}>
                            <div>
                                <span>Bill Amount</span>
                                <strong>₹ {grandTotal.toFixed(2)}</strong>
                            </div>

                            <div>
                                <span>Previous Balance</span>
                                <strong>₹ {Number(prevBalance).toFixed(2)}</strong>
                            </div>

                            <div>
                                <span>Available Loyalty</span>
                                <strong>{Number(availableLoyalty).toFixed(0)}</strong>
                            </div>
                        </div>

                        <label className={styles.loyaltyField}>
                            <span>Redeem Points</span>
                            <input
                                type="text"
                                min="0"
                                max={availableLoyalty}
                                value={redeemPoints}
                                onChange={(e) => setRedeemPoints(e.target.value)}
                            />
                        </label>

                        {renderPaymentFields()}

                        <div className={styles.leftFooter}>

                            <div className={styles.shareOptions}>
                                <label className={styles.shareCheckbox}>
                                    <input type="checkbox" />

                                    <FaWhatsapp
                                        className={styles.whatsappIcon}
                                        size={16}
                                    />

                                    <span>WhatsApp</span>
                                </label>

                                <label className={styles.shareCheckbox}>
                                    <input type="checkbox" />

                                    <MdSms
                                        className={styles.smsIcon}
                                        size={17}
                                    />

                                    <span>SMS</span>
                                </label>

                                <label className={styles.shareCheckbox}>
                                    <input type="checkbox" />
                                    <span>Disable bill print</span>
                                </label>
                            </div>
                        </div>
                    </section>

                    <section className={styles.rightSection}>
                        <div className={styles.statusSection}>
                            <p className={styles.statusTitle}>Payment Status</p>

                            <div className={styles.statusOptions}>
                                <button
                                    type="button"
                                    className={`${styles.statusBtn} ${paymentStatus === "paid" ? styles.statusBtnActive : ""
                                        }`}
                                    onClick={() => {
                                        setPaymentStatus("paid");

                                        if (paymentMethod !== "split") {
                                            setReceivedAmount(payableAmount.toFixed(2));
                                        }
                                    }}
                                >
                                    Paid
                                </button>

                                <button
                                    type="button"
                                    className={`${styles.statusBtn} ${paymentStatus === "due" ? styles.statusBtnActive : ""
                                        }`}
                                    onClick={() => {
                                        setPaymentStatus("due");
                                        setReceivedAmount("");
                                        setCashAmount("");
                                        setUpiAmount("");
                                        setCardAmount("");
                                    }}
                                >
                                    Due
                                </button>
                            </div>
                        </div>
                        <div className={styles.paymentOptions}>
                            {PAYMENT_OPTIONS.map((option) => (
                                <button
                                    type="button"
                                    key={option.key}
                                    className={`${styles.paymentOption} ${paymentMethod === option.key
                                        ? styles.paymentOptionActive
                                        : ""
                                        }`}
                                    onClick={() => handlePaymentSelect(option.key)}
                                >
                                    <strong>{option.shortcut}.</strong>
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className={styles.tenderSummary}>
                            <div className={styles.summaryRow}>
                                <span>Bill Amount</span>
                                <strong>₹ {grandTotal.toFixed(2)}</strong>
                            </div>

                            <div className={styles.summaryRow}>
                                <span>Tender Received</span>
                                <strong>₹ {totalReceived.toFixed(2)}</strong>
                            </div>

                            <div className={`${styles.summaryRow} ${styles.returnRow}`}>
                                <span>Return Amount</span>
                                <strong>
                                    ₹ {balanceAmount.toFixed(2)}
                                </strong>
                            </div>
                        </div>

                    </section>
                </div>

                <div className={styles.footerActions}>
                    <button
                        type="button"
                        className={styles.doneButton}
                        onClick={handleConfirm}
                        disabled={
                            loading ||
                            Number(redeemPoints || 0) >
                            Number(availableLoyalty || 0)
                        }
                    >
                        {loading ? "Saving..." : "Done"}
                    </button>

                    <button
                        type="button"
                        className={styles.exitButton}
                        onClick={onClose}
                        disabled={loading}
                    >
                        Exit
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BillingPopup;

