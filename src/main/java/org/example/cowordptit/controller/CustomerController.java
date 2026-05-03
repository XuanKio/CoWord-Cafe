package org.example.cowordptit.controller;

import org.example.cowordptit.dto.request.AddHoursRequestDto;
import org.example.cowordptit.dto.request.CreateCustomerRequestDto;
import org.example.cowordptit.dto.request.UpdateCustomerRequestDto;
import org.example.cowordptit.dto.response.ApiResponse;
import org.example.cowordptit.service.CafeSessionService;
import org.example.cowordptit.service.CustomerService;
import org.example.cowordptit.service.ServiceRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({ "/api/customers", "/api/users" })
public class CustomerController {

    private final CustomerService customerService;
    private final CafeSessionService cafeSessionService;
    private final ServiceRequestService serviceRequestService;

    public CustomerController(CustomerService customerService, CafeSessionService cafeSessionService,
            ServiceRequestService serviceRequestService) {
        this.customerService = customerService;
        this.cafeSessionService = cafeSessionService;
        this.serviceRequestService = serviceRequestService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(customerService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getById(@PathVariable Long id) {
        return customerService.getById(id)
                .map(customer -> ResponseEntity.ok(ApiResponse.success(customer)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Khong tim thay khach hang")));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody CreateCustomerRequestDto req) {
        Map<String, Object> customer = customerService.create(req.getName(), req.getPhone(), req.getPassword());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tao khach hang thanh cong", customer));
    }

    @RequestMapping(path = "/{id}", method = { RequestMethod.PUT, RequestMethod.PATCH })
    public ResponseEntity<ApiResponse<Map<String, Object>>> update(@PathVariable Long id,
            @RequestBody UpdateCustomerRequestDto req) {
        return customerService.update(
                id,
                req.getName(),
                req.getPhone(),
                req.getPassword(),
                req.getStatus(),
                req.getRemainingHours())
                .map(customer -> ResponseEntity.ok(ApiResponse.success("Cap nhat khach hang thanh cong", customer)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Khong tim thay khach hang")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> delete(@PathVariable Long id) {
        if (!customerService.delete(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Khong tim thay khach hang"));
        }
        return ResponseEntity.ok(ApiResponse.success("Xoa khach hang thanh cong", null));
    }

    @PatchMapping("/{id}/add-hours")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addHours(@PathVariable Long id,
            @RequestBody AddHoursRequestDto req) {
        return customerService.addHours(id, req.getHours())
                .map(customer -> ResponseEntity.ok(ApiResponse.success(
                        "Da nap " + req.getHours() + "h cho " + customer.get("name"),
                        customer)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Khong tim thay khach hang")));
    }

    @GetMapping("/{id}/sessions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSessionsByUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(cafeSessionService.getSessionsByCustomer(id)));
    }

    @GetMapping("/{id}/requests")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRequestsByUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(serviceRequestService.getByCustomer(id)));
    }
}
