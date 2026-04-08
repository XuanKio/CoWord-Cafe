package org.example.cowordptit.controller;

import org.example.cowordptit.dto.request.PaymentRequestDto;
import org.example.cowordptit.dto.response.ApiResponse;
import org.example.cowordptit.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * PaymentController — Quản lý thanh toán
 * GET /api/payments → tất cả giao dịch
 * GET /api/payments/request/{id} → giao dịch theo yêu cầu
 * POST /api/payments → tạo giao dịch thanh toán (admin dùng sau khi APPROVED)
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getAll()));
    }

    @GetMapping("/request/{requestId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getByRequest(@PathVariable Long requestId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getByRequest(requestId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody PaymentRequestDto req) {
        Map<String, Object> payment = paymentService.create(
                req.getServiceRequestsId(),
                req.getAmount(),
                req.getPaymentMethod());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo thanh toán thành công", payment));
    }
}
