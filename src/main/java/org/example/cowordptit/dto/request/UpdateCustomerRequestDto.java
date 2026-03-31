package org.example.cowordptit.dto.request;

import java.math.BigDecimal;

public class UpdateCustomerRequestDto {
    private String name;
    private String phone;
    private String password;
    private String status;
    private BigDecimal remainingHours;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getRemainingHours() {
        return remainingHours;
    }

    public void setRemainingHours(BigDecimal remainingHours) {
        this.remainingHours = remainingHours;
    }
}
