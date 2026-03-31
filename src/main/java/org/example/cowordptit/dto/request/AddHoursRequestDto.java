package org.example.cowordptit.dto.request;

import java.math.BigDecimal;

public class AddHoursRequestDto {
    private BigDecimal hours;
    private String note;

    public BigDecimal getHours() {
        return hours;
    }

    public void setHours(BigDecimal hours) {
        this.hours = hours;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
