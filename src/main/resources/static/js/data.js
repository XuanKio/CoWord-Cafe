import {
  customerApi,
  sessionApi,
  serviceApi,
  packageApi,
  packageSaleApi,
  serviceOrderApi,
  reportApi,
} from './api.js';

// ===== generateId (vẫn dùng ở một số nơi tạo object trước khi gửi API) =====
export function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ===== initData: không còn cần seed, giữ lại để không vỡ import =====
export function initData() {
  // No-op: dữ liệu lấy từ MySQL qua API
}

// ===== CUSTOMERS =====
export async function getCustomers() {
  const rows = await customerApi.getAll();
  return rows.map((c) => ({
    ...c,
    remainingMinutes: c.remaining_minutes ?? c.remainingMinutes ?? 0,
    totalMinutesBought: c.total_minutes_bought ?? c.totalMinutesBought ?? 0,
    createdAt: new Date(c.created_at ?? c.createdAt),
  }));
}

export async function saveCustomer(customer) {
  await customerApi.update(customer.id, {
    name: customer.name,
    phone: customer.phone,
    password: customer.password,
    remainingMinutes: customer.remainingMinutes,
    totalMinutesBought: customer.totalMinutesBought,
    status: customer.status,
    note: customer.note,
  });
}

export async function createCustomer(customer) {
  return customerApi.create({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    password: customer.password,
    remainingMinutes: customer.remainingMinutes,
    totalMinutesBought: customer.totalMinutesBought,
    status: customer.status,
    note: customer.note,
  });
}

export async function deleteCustomer(id) {
  await customerApi.delete(id);
}

// ===== SESSIONS =====
export async function getSessions() {
  const rows = await sessionApi.getAll();
  return rows.map((s) => ({
    ...s,
    customerId: s.customer_id ?? s.customerId,
    customerName: s.customer_name ?? s.customerName,
    customerPhone: s.customer_phone ?? s.customerPhone,
    minutesUsed: s.minutes_used ?? s.minutesUsed ?? 0,
    totalCost: s.total_cost ?? s.totalCost ?? 0,
    checkIn: new Date(s.check_in ?? s.checkIn),
    checkOut: (s.check_out ?? s.checkOut) ? new Date(s.check_out ?? s.checkOut) : undefined,
  }));
}

export async function getActiveSessions() {
  const rows = await sessionApi.getActive();
  return rows.map((s) => ({
    ...s,
    customerId: s.customer_id ?? s.customerId,
    customerName: s.customer_name ?? s.customerName,
    customerPhone: s.customer_phone ?? s.customerPhone,
    minutesUsed: s.minutes_used ?? s.minutesUsed ?? 0,
    totalCost: s.total_cost ?? s.totalCost ?? 0,
    checkIn: new Date(s.check_in ?? s.checkIn),
    checkOut: (s.check_out ?? s.checkOut) ? new Date(s.check_out ?? s.checkOut) : undefined,
  }));
}

export async function createSession(session) {
  await sessionApi.create({
    id: session.id,
    customerId: session.customerId,
    customerName: session.customerName,
    customerPhone: session.customerPhone,
    checkIn: session.checkIn,
    status: session.status,
  });
}

export async function updateSession(id, data) {
  await sessionApi.update(id, data);
}

// ===== SERVICES =====
export async function getServices() {
  const rows = await serviceApi.getAll();
  return rows.map((s) => ({
    ...s,
    available: s.available === 1 || s.available === true,
  }));
}

export async function createService(service) {
  await serviceApi.create(service);
}

export async function updateService(id, service) {
  await serviceApi.update(id, service);
}

export async function deleteService(id) {
  await serviceApi.delete(id);
}

// ===== PACKAGES =====
export async function getPackages() {
  const rows = await packageApi.getAll();
  return rows.map((p) => ({
    ...p,
    totalMinutes: p.total_minutes ?? p.totalMinutes,
    popular: p.popular === 1 || p.popular === true,
  }));
}

export async function createPackage(pkg) {
  await packageApi.create({
    id: pkg.id,
    name: pkg.name,
    totalMinutes: pkg.totalMinutes,
    price: pkg.price,
    description: pkg.description,
    popular: pkg.popular,
  });
}

export async function updatePackage(id, pkg) {
  await packageApi.update(id, pkg);
}

export async function deletePackage(id) {
  await packageApi.delete(id);
}

// ===== PACKAGE SALES =====
export async function getPackageSales() {
  const rows = await packageSaleApi.getAll();
  return rows.map((p) => ({
    ...p,
    customerId: p.customer_id ?? p.customerId,
    customerName: p.customer_name ?? p.customerName,
    packageId: p.package_id ?? p.packageId,
    packageName: p.package_name ?? p.packageName,
    minutesBought: p.minutes_bought ?? p.minutesBought,
    pricePaid: p.price_paid ?? p.pricePaid,
    soldAt: new Date(p.sold_at ?? p.soldAt),
  }));
}

export async function createPackageSale(sale) {
  await packageSaleApi.create({
    id: sale.id,
    customerId: sale.customerId,
    customerName: sale.customerName,
    packageId: sale.packageId,
    packageName: sale.packageName,
    minutesBought: sale.minutesBought,
    pricePaid: sale.pricePaid,
    soldAt: sale.soldAt,
  });
}

// ===== SERVICE ORDERS =====
export async function getServiceOrders() {
  const rows = await serviceOrderApi.getAll();
  return rows.map((o) => ({
    ...o,
    customerId: o.customer_id ?? o.customerId,
    customerName: o.customer_name ?? o.customerName,
    customerPhone: o.customer_phone ?? o.customerPhone,
    sessionId: o.session_id ?? o.sessionId,
    serviceId: o.service_id ?? o.serviceId,
    serviceName: o.service_name ?? o.serviceName,
    serviceCategory: o.service_category ?? o.serviceCategory,
    unitPrice: o.unit_price ?? o.unitPrice,
    totalPrice: o.total_price ?? o.totalPrice,
    orderedAt: new Date(o.ordered_at ?? o.orderedAt),
    servedAt: (o.served_at ?? o.servedAt) ? new Date(o.served_at ?? o.servedAt) : undefined,
    paidAt: (o.paid_at ?? o.paidAt) ? new Date(o.paid_at ?? o.paidAt) : undefined,
  }));
}

export async function createServiceOrder(order) {
  await serviceOrderApi.create({
    id: order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    sessionId: order.sessionId,
    serviceId: order.serviceId,
    serviceName: order.serviceName,
    serviceCategory: order.serviceCategory,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    totalPrice: order.totalPrice,
    orderedAt: order.orderedAt,
    status: order.status,
    note: order.note,
  });
}

export async function createPackageRequest(customerId, packageId, pricePaid) {
  await serviceOrderApi.createPackageRequest({
    customerId,
    packageId,
    pricePaid,
  });
}

export async function updateServiceOrderStatus(id, status, timestamp) {
  await serviceOrderApi.updateStatus(id, status, timestamp);
}

// ===== REPORTS =====
export async function getReports() {
  return reportApi.getAll();
}
