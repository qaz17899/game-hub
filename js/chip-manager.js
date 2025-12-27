/**
 * Chip Manager - Virtual Currency System
 * Uses localStorage for persistence
 */

const ChipManager = (function () {
  const STORAGE_KEY = "arcade_chips";
  const INITIAL_BALANCE = 10000;

  /**
   * Get current chip balance
   * @returns {number}
   */
  function getBalance() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      setBalance(INITIAL_BALANCE);
      return INITIAL_BALANCE;
    }
    return parseInt(stored, 10);
  }

  /**
   * Set chip balance directly
   * @param {number} amount
   */
  function setBalance(amount) {
    const value = Math.max(0, Math.floor(amount));
    localStorage.setItem(STORAGE_KEY, value.toString());
    dispatchBalanceChange(value);
    return value;
  }

  /**
   * Deduct chips from balance
   * @param {number} amount
   * @returns {boolean} Success status
   */
  function deduct(amount) {
    const current = getBalance();
    if (current < amount) {
      return false;
    }
    setBalance(current - amount);
    return true;
  }

  /**
   * Award chips to balance
   * @param {number} amount
   * @returns {number} New balance
   */
  function award(amount) {
    const current = getBalance();
    return setBalance(current + amount);
  }

  /**
   * Reset balance to initial amount
   * @returns {number}
   */
  function reset() {
    return setBalance(INITIAL_BALANCE);
  }

  /**
   * Check if player can afford a bet
   * @param {number} amount
   * @returns {boolean}
   */
  function canAfford(amount) {
    return getBalance() >= amount;
  }

  /**
   * Dispatch custom event for balance changes
   * @param {number} newBalance
   */
  function dispatchBalanceChange(newBalance) {
    window.dispatchEvent(
      new CustomEvent("chipBalanceChange", {
        detail: { balance: newBalance },
      })
    );
  }

  /**
   * Format chips for display
   * @param {number} amount
   * @returns {string}
   */
  function format(amount) {
    return amount.toLocaleString();
  }

  // Public API
  return {
    getBalance,
    setBalance,
    deduct,
    award,
    reset,
    canAfford,
    format,
    INITIAL_BALANCE,
  };
})();

// Auto-update UI elements with class 'chip-display'
window.addEventListener("chipBalanceChange", (e) => {
  document.querySelectorAll(".chip-display").forEach((el) => {
    el.textContent = ChipManager.format(e.detail.balance);
  });
});

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  // Trigger initial balance display
  const balance = ChipManager.getBalance();
  window.dispatchEvent(
    new CustomEvent("chipBalanceChange", {
      detail: { balance },
    })
  );
});
