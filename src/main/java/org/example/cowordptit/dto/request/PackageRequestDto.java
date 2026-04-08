package org.example.cowordptit.dto.request;

import java.math.BigDecimal;

public class PackageRequestDto {
    private String name;
    private String status;
    private BigDecimal hoursAmount;
    private BigDecimal price;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getHoursAmount() {
        return hoursAmount;
    }

    public void setHoursAmount(BigDecimal hoursAmount) {
        this.hoursAmount = hoursAmount;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

}
