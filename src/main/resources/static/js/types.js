// ===== TYPES =====
// Types are removed in JS - kept as JSDoc comments for documentation

/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} name
 * @property {string} phone
 * @property {string} password
 * @property {number} remainingMinutes
 * @property {number} totalMinutesBought
 * @property {'active'|'inactive'|'checkin'} status
 * @property {Date} createdAt
 * @property {string} [note]
 */

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} customerId
 * @property {string} customerName
 * @property {string} customerPhone
 * @property {Date} checkIn
 * @property {Date} [checkOut]
 * @property {number} minutesUsed
 * @property {number} totalCost
 * @property {'active'|'completed'} status
 */

/**
 * @typedef {Object} Service
 * @property {string} id
 * @property {string} name
 * @property {'food'|'drink'|'other'} category
 * @property {number} price
 * @property {string} unit
 * @property {boolean} available
 * @property {string} [description]
 */

/**
 * @typedef {Object} Package
 * @property {string} id
 * @property {string} name
 * @property {number} totalMinutes
 * @property {number} price
 * @property {string} [description]
 * @property {boolean} [popular]
 */

/**
 * @typedef {Object} PackageSale
 * @property {string} id
 * @property {string} customerId
 * @property {string} customerName
 * @property {string} packageId
 * @property {string} packageName
 * @property {number} minutesBought
 * @property {number} pricePaid
 * @property {Date} soldAt
 */

/**
 * @typedef {Object} ServiceOrder
 * @property {string} id
 * @property {string} customerId
 * @property {string} customerName
 * @property {string} [customerPhone]
 * @property {string} [sessionId]
 * @property {string} serviceId
 * @property {string} serviceName
 * @property {'food'|'drink'|'other'|'package'} [serviceCategory]
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} totalPrice
 * @property {Date} orderedAt
 * @property {'pending'|'serving'|'paid'|'rejected'} status
 * @property {Date} [servedAt]
 * @property {Date} [paidAt]
 * @property {string} [note]
 */

/**
 * @typedef {Object} Report
 * @property {string} date
 * @property {number} sessionRevenue
 * @property {number} serviceRevenue
 * @property {number} packageRevenue
 * @property {number} sessionCount
 * @property {number} serviceOrderCount
 * @property {number} newCustomers
 */

// Export empty object for module compatibility
export {};
