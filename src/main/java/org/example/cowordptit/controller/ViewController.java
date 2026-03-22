package org.example.cowordptit.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/")
    public String index() {
        return "forward:/login";
    }

    @GetMapping("/login")
    public String login() {
        return "login.html";
    }

    @GetMapping("/admin")
    public String admin() {
        return "admin.html";
    }

    @GetMapping("/user")
    public String user() {
        return "user.html";
    }
}
