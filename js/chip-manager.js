/**
 * Chip Manager - Virtual Currency System
 * Uses localStorage with memory fallback for Discord iframe
 */

const ChipManager = (function () {
  const STORAGE_KEY = "arcade_chips";
  const INITIAL_BALANCE = 10000;
  
  // Memory fallback for when localStorage is blocked (Discord iframe)
  let memoryBalance = null;
  let useMemoryFallback = false;

  /**
   * Check if localStorage is available
   */
  function isLocalStorageAvailable() {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Initialize storage mode
  if (!isLocalStorageAvailable()) {
    console.warn('[ChipManager] localStorage unavailable, using memory fallback');
    useMemoryFallback = true;
    memoryBalance = INITIAL_BALANCE;
  }

  /**
   * Get current chip balance
   * @returns {number}
   */
  function getBalance() {
    if (useMemoryFallback) {
      if (memoryBalance === null) {
        memoryBalance = INITIAL_BALANCE;
      }
      return memoryBalance;
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        setBalance(INITIAL_BALANCE);
        return INITIAL_BALANCE;
      }
      return parseInt(stored, 10);
    } catch (e) {
      // Fallback to memory if localStorage fails
      useMemoryFallback = true;
      if (memoryBalance === null) {
        memoryBalance = INITIAL_BALANCE;
      }
      return memoryBalance;
    }
  }

  /**
   * Set chip balance directly
   * @param {number} amount
   */
  function setBalance(amount) {
    const value = Math.max(0, Math.floor(amount));
    
    if (useMemoryFallback) {
      memoryBalance = value;
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, value.toString());
      } catch (e) {
        useMemoryFallback = true;
        memoryBalance = value;
      }
    }
    
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

  /**
   * Check if using memory fallback
   * @returns {boolean}
   */
  function isUsingMemoryFallback() {
    return useMemoryFallback;
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
    isUsingMemoryFallback,
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
