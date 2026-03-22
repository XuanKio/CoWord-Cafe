package org.example.cowordptit.config;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.*;
import org.example.cowordptit.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;


@Configuration
@RequiredArgsConstructor
public class DataInitializer {
    // removed passwordEncoder
    @Bean
    public CommandLineRunner initData(
            AdminRepository adminRepository,
            CustomerRepository customerRepository,
            PackageRepository packageRepository,
            CafeServiceRepository cafeServiceRepository) {
        return args -> {

            // ===== ADMIN =====
            if (adminRepository.count() == 0) {
                Admin admin = new Admin();
                admin.setAdminId(1);
                admin.setUsername("admin");
                admin.setPhone("0900000000");
                admin.setPasswordHash("admin123");
                adminRepository.save(admin);
                System.out.println("✅ Created admin: admin / admin123");
            }

            // ===== CUSTOMERS =====
            if (customerRepository.count() == 0) {
                customerRepository
                        .save(makeCustomer("Nguyen Minh Anh", "0911111111", "user123", new BigDecimal("5.00")));
                customerRepository.save(makeCustomer("Tran Quoc Bao", "0922222222", "user123", BigDecimal.ZERO));
                customerRepository.save(makeCustomer("Le Thao Vy", "0933333333", "user123", new BigDecimal("10.00")));
                customerRepository.save(makeCustomer("Pham Gia Huy", "0944444444", "user123", new BigDecimal("3.00")));
                System.out.println("✅ Created 4 customers (password: user123)");
            }

            // ===== PACKAGES =====
            if (packageRepository.count() == 0) {
                packageRepository.save(makePackage("Goi 5 gio", new BigDecimal("5"), new BigDecimal("50000")));
                packageRepository.save(makePackage("Goi 10 gio", new BigDecimal("10"), new BigDecimal("90000")));
                packageRepository.save(makePackage("Goi 20 gio", new BigDecimal("20"), new BigDecimal("170000")));
                System.out.println("✅ Created 3 packages");
            }

            // ===== SERVICES (MENU) =====
            if (cafeServiceRepository.count() == 0) {
                cafeServiceRepository
                        .save(makeService("Ca phe den", CafeService.ServiceType.DRINK, new BigDecimal("25000")));
                cafeServiceRepository
                        .save(makeService("Ca phe sua", CafeService.ServiceType.DRINK, new BigDecimal("30000")));
                cafeServiceRepository
                        .save(makeService("Tra dao", CafeService.ServiceType.DRINK, new BigDecimal("30000")));
                cafeServiceRepository.save(makeService("Mi ly", CafeService.ServiceType.FOOD, new BigDecimal("20000")));
                cafeServiceRepository
                        .save(makeService("Banh mi", CafeService.ServiceType.FOOD, new BigDecimal("15000")));
                System.out.println("✅ Created 5 menu items");
            }

            System.out.println("🚀 CoWorking Cafe API is ready at http://localhost:8080");
            System.out.println("📋 API Endpoints:");
            System.out.println("   POST /api/auth/admin   → Admin login (username + password)");
            System.out.println("   POST /api/auth/user    → User login (phone + password)");
            System.out.println("   GET  /api/customers    → Danh sach khach hang");
            System.out.println("   GET  /api/packages     → Danh sach goi gio");
            System.out.println("   GET  /api/menu         → Danh sach do an/nuoc");
            System.out.println("   GET  /api/sessions     → Danh sach phien ngoi");
            System.out.println("   GET  /api/requests     → Danh sach yeu cau");
            System.out.println("   GET  /api/payments     → Danh sach thanh toan");
        };
    }

    private Customer makeCustomer(String name, String phone, String password, BigDecimal hours) {
        Customer c = new Customer();
        c.setName(name);
        c.setPhone(phone);
        c.setPasswordHash(password);
        c.setRemainingHours(hours);
        c.setStatus(Customer.CustomerStatus.ACTIVE);
        return c;
    }

    private TimePackage makePackage(String name, BigDecimal hours, BigDecimal price) {
        TimePackage p = new TimePackage();
        p.setName(name);
        p.setHoursAmount(hours);
        p.setPrice(price);
        p.setStatus(TimePackage.PackageStatus.AVAILABLE);
        return p;
    }

    private CafeService makeService(String name, CafeService.ServiceType type, BigDecimal price) {
        CafeService s = new CafeService();
        s.setName(name);
        s.setType(type);
        s.setPrice(price);
        s.setStatus(CafeService.ServiceStatus.AVAILABLE);
        return s;
    }
}
