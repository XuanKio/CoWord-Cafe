package org.example.cowordptit.dto.request;

public class CreateServiceRequestDto {
    private Long usersId;
    private Long sessionsId;
    private Long servicesId;
    private Long packagesId;
    private Integer quantity;

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
}
