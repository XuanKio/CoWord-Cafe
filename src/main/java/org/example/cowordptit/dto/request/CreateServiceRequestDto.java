package org.example.cowordptit.dto.request;

import java.math.BigDecimal;

public class CreateServiceRequestDto {
    private Long usersId;
    private Long sessionsId;
    private Long servicesId;
    private Long packagesId;
    private Integer quantity;
    private BigDecimal price;
    private BigDecimal unitPrice;
    private BigDecimal hiddenPrice;

    public Long getUsersId() {
        return usersId;
    }

    public void setUsersId(Long usersId) {
        this.usersId = usersId;
    }

    public Long getSessionsId() {
        return sessionsId;
    }

    public void setSessionsId(Long sessionsId) {
        this.sessionsId = sessionsId;
    }

    public Long getServicesId() {
        return servicesId;
    }

    public void setServicesId(Long servicesId) {
        this.servicesId = servicesId;
    }

    public Long getPackagesId() {
        return packagesId;
    }

    public void setPackagesId(Long packagesId) {
        this.packagesId = packagesId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getHiddenPrice() {
        return hiddenPrice;
    }

    public void setHiddenPrice(BigDecimal hiddenPrice) {
        this.hiddenPrice = hiddenPrice;
    }
}
