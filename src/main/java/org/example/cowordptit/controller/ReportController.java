package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.dto.response.ApiResponse;
import org.example.cowordptit.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getReports(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getReports(from, to)));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTransactionReport(
            @RequestParam(required = false) String month,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getTransactionReport(month, from, to)));
    }
}
