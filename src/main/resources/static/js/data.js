import {
  customerApi,
  sessionApi,
  menuApi,
  packageApi,
  packageSaleApi,
  serviceOrderApi,
  reportApi,
  paymentApi,
} from './api.js';

const SESSION_HOURLY_RATE = 18000;

export function generateId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function initData() {
  // No-op: all data comes from backend APIs.
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDate(value) {
  return value ? new Date(value) : undefined;
}

function hoursToMinutes(hours) {
  return Math.max(0, Math.round(toNumber(hours) * 60));
}

function minutesToHours(minutes) {
  return Number((toNumber(minutes) / 60).toFixed(2));
}

function mapCustomerStatus(apiStatus, hasActiveSession) {
  if (hasActiveSession) return 'checkin';
  const normalized = String(apiStatus || '').toUpperCase();
  if (normalized === 'UNACTIVE' || normalized === 'INACTIVE') return 'inactive';
  return 'active';
}

function toBackendCustomerStatus(status) {
  if (!status) return undefined;
  const normalized = String(status).toLowerCase();
  if (normalized === 'inactive') return 'UNACTIVE';
  if (normalized === 'active' || normalized === 'checkin') return 'ACTIVE';
  return undefined;
}

function mapRequestStatus(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return 'pending';
    case 'APPROVED':
      return 'serving';
    case 'PAID':
      return 'paid';
    case 'CANCELLED':
      return 'rejected';
    default:
      return 'pending';
  }
}

function mapServiceType(type) {
  const normalized = String(type || '').toUpperCase();
  if (normalized === 'DRINK') return 'drink';
  if (normalized === 'FOOD') return 'food';
  return 'other';
}

function toBackendServiceType(category) {
  const normalized = String(category || '').toLowerCase();
  if (normalized === 'food') return 'FOOD';
  return 'DRINK';
}

export async function getCustomers() {
  const [rows, activeSessions] = await Promise.all([
    customerApi.getAll(),
    sessionApi.getActive().catch(() => []),
  ]);

  const activeUserIds = new Set((activeSessions || []).map((s) => String(s.usersId)));

  return (rows || []).map((c) => {
    const id = String(c.usersId);
    const remainingHours = toNumber(c.remainingHours);
    const remainingMinutes = hoursToMinutes(remainingHours);

    return {
      ...c,
      id,
      usersId: c.usersId,
      remainingHours,
      remainingMinutes,
      totalMinutesBought: toNumber(c.totalMinutesBought, remainingMinutes),
      createdAt: toDate(c.createdAt) || new Date(),
      status: mapCustomerStatus(c.status, activeUserIds.has(id)),
    };
  });
}

export async function saveCustomer(customer) {
  const payload = {
    name: customer.name,
    phone: customer.phone,
    password: customer.password,
    remainingHours: minutesToHours(customer.remainingMinutes ?? 0),
    status: toBackendCustomerStatus(customer.status),
  };

  await customerApi.update(customer.id, payload);
}

export async function createCustomer(customer) {
  const created = await customerApi.create({
    name: customer.name,
    phone: customer.phone,
    password: customer.password,
  });

  const remainingMinutes = toNumber(customer.remainingMinutes);
  if (remainingMinutes > 0) {
    await customerApi.addHours(created.usersId, minutesToHours(remainingMinutes), 'Init topup');
  }

  return created;
}

export async function deleteCustomer(id) {
  await customerApi.delete(id);
}

function normalizeSession(s) {
  const hoursUsed = toNumber(s.hoursUsed);
  const checkIn = toDate(s.checkIn) || new Date();
  const checkOut = toDate(s.checkOut);
  return {
    ...s,
    id: String(s.sessionsId),
    sessionsId: s.sessionsId,
    customerId: String(s.usersId),
    customerName: s.customerName,
    customerPhone: s.customerPhone || '',
    checkIn,
    checkOut,
    hoursUsed,
    minutesUsed: Math.round(hoursUsed * 60),
    totalCost: Math.round(hoursUsed * SESSION_HOURLY_RATE),
    status: String(s.status || '').toUpperCase() === 'ONGOING' ? 'active' : 'completed',
  };
}

export async function getSessions() {
  const rows = await sessionApi.getAll();
  return (rows || []).map(normalizeSession);
}

export async function getActiveSessions() {
  const rows = await sessionApi.getActive();
  return (rows || []).map(normalizeSession);
}

export async function createSession(session) {
  await sessionApi.checkIn(Number(session.customerId ?? session.usersId));
}

export async function updateSession(id, data) {
  if (data?.status === 'completed' || data?.checkOut) {
    await sessionApi.checkOut(Number(id));
  }
}

export async function getServices() {
  const rows = await menuApi.getAll();
  return (rows || []).map((s) => ({
    ...s,
    id: String(s.servicesId),
    category: mapServiceType(s.type),
    description: s.description || '',
    unit: s.unit || 'phan',
    available: String(s.status || '').toUpperCase() === 'AVAILABLE',
  }));
}

export async function createService(service) {
  await menuApi.create({
    name: service.name,
    type: toBackendServiceType(service.category),
    price: service.price,
    status: service.available === false ? 'UNAVAILABLE' : 'AVAILABLE',
  });
}

export async function updateService(id, service) {
  await menuApi.update(id, {
    name: service.name,
    type: service.category ? toBackendServiceType(service.category) : undefined,
    price: service.price,
    status: service.available == null ? undefined : (service.available ? 'AVAILABLE' : 'UNAVAILABLE'),
  });
}

export async function deleteService(id) {
  await menuApi.delete(id);
}

export async function getPackages() {
  const rows = await packageApi.getAll();
  return (rows || []).map((p) => ({
    ...p,
    id: String(p.packagesId),
    totalMinutes: hoursToMinutes(p.hoursAmount),
    description: p.description || '',
    popular: Boolean(p.popular),
  }));
}

export async function createPackage(pkg) {
  await packageApi.create({
    name: pkg.name,
    hoursAmount: minutesToHours(pkg.totalMinutes),
    price: pkg.price,
    status: 'AVAILABLE',
  });
}

export async function updatePackage(id, pkg) {
  await packageApi.update(id, {
    name: pkg.name,
    hoursAmount: pkg.totalMinutes == null ? undefined : minutesToHours(pkg.totalMinutes),
    price: pkg.price,
    status: pkg.available === false ? 'UNAVAILABLE' : undefined,
  });
}

export async function deletePackage(id) {
  await packageApi.delete(id);
}

export async function getServiceOrders() {
  const [requests, payments] = await Promise.all([
    serviceOrderApi.getAll(),
    paymentApi.getAll(),
  ]);

  const paymentByRequestId = new Map((payments || []).map((p) => [String(p.serviceRequestsId), p]));

  return (requests || []).map((o) => {
    const quantity = Math.max(1, toNumber(o.quantity, 1));
    const totalPrice = toNumber(o.totalPrice);
    const isPackage = o.packagesId != null;
    const payment = paymentByRequestId.get(String(o.serviceRequestsId));
    const rawStatus = String(o.status || '').toUpperCase();

    return {
      ...o,
      id: String(o.serviceRequestsId),
      customerId: String(o.usersId),
      customerName: o.customerName,
      customerPhone: o.customerPhone || '',
      sessionId: o.sessionsId != null ? String(o.sessionsId) : '',
      serviceId: o.servicesId != null ? String(o.servicesId) : (o.packagesId != null ? String(o.packagesId) : ''),
      serviceName: isPackage ? o.packageName : o.serviceName,
      serviceCategory: isPackage ? 'package' : mapServiceType(o.serviceType),
      quantity,
      unitPrice: quantity > 0 ? totalPrice / quantity : totalPrice,
      totalPrice,
      orderedAt: toDate(o.createdAt) || new Date(),
      servedAt: ['APPROVED', 'PAID'].includes(rawStatus) ? (toDate(o.createdAt) || new Date()) : undefined,
      paidAt: payment?.createdAt ? new Date(payment.createdAt) : undefined,
      status: mapRequestStatus(o.status),
      note: o.note || '',
    };
  });
}

export async function createServiceOrder(order) {
  const payload = {
    usersId: Number(order.customerId),
    quantity: Math.max(1, toNumber(order.quantity, 1)),
  };

  if (order.sessionId != null && String(order.sessionId) !== '') {
    payload.sessionsId = Number(order.sessionId);
  }

  if (order.serviceCategory === 'package' || order.packageId != null) {
    payload.packagesId = Number(order.packageId ?? order.serviceId);
  } else {
    payload.servicesId = Number(order.serviceId);
  }

  await serviceOrderApi.create(payload);
}

export async function createPackageRequest(customerId, packageId, pricePaid) {
  return serviceOrderApi.createPackageRequest({
    customerId: Number(customerId),
    packageId: Number(packageId),
    pricePaid,
  });
}

export async function updateServiceOrderStatus(id, status, timestamp) {
  await serviceOrderApi.updateStatus(Number(id), status, timestamp);
}

export async function getPackageSales() {
  const [orders, packages] = await Promise.all([
    getServiceOrders(),
    getPackages(),
  ]);

  const packageById = new Map(packages.map((p) => [String(p.id), p]));

  return orders
    .filter((o) => o.serviceCategory === 'package' && o.status === 'paid')
    .map((o) => {
      const pkg = packageById.get(String(o.serviceId));
      return {
        id: o.id,
        customerId: o.customerId,
        customerName: o.customerName,
        packageId: String(o.serviceId),
        packageName: o.serviceName,
        minutesBought: (pkg?.totalMinutes || 0) * Math.max(1, toNumber(o.quantity, 1)),
        pricePaid: o.totalPrice,
        soldAt: o.paidAt || o.orderedAt,
      };
    });
}

export async function createPackageSale(sale) {
  return packageSaleApi.create({
    customerId: Number(sale.customerId),
    packageId: Number(sale.packageId),
    quantity: Math.max(1, toNumber(sale.quantity, 1)),
    pricePaid: sale.pricePaid,
  });
}

export async function getReports() {
  const rows = await reportApi.getAll();
  return (rows || []).map((r) => ({
    date: r.date,
    sessionRevenue: toNumber(r.sessionRevenue),
    serviceRevenue: toNumber(r.serviceRevenue),
    packageRevenue: toNumber(r.packageRevenue),
    sessionCount: toNumber(r.sessionCount),
    serviceOrderCount: toNumber(r.serviceOrderCount),
    newCustomers: toNumber(r.newCustomers),
  }));
}
