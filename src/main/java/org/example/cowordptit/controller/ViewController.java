package org.example.cowordptit.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/")
    public String index() {
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String login() {
        return "forward:/login.html";
    }

    @GetMapping("/admin")
    public String adminAlias() {
        return "redirect:/app/admin/dashboard";
    }

    @GetMapping({ "/app/admin", "/app/admin/{section}" })
    public String admin() {
        return "forward:/admin.html";
    }

    @GetMapping("/user")
    public String userAlias() {
        return "redirect:/app/me";
    }

    @GetMapping({ "/app/me", "/app/users/{id}" })
    public String user() {
        return "forward:/user.html";
    }
}
