package com.kuet.meet.controller;

import com.kuet.meet.model.Users;
import com.kuet.meet.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class UserController {

    @Autowired
    private UserService service;

    @PostMapping("/users")
    public void register(
            @RequestBody Users user
    ) {
        service.register(user);
    }

    @PostMapping("/login")
    public Users login(@RequestBody Users user) {
        return service.login(user);
    }

    @PostMapping("/logout")
    public void logout(@RequestBody Users email) {
        service.logout(email.getEmail());
    }

    @GetMapping
    public List<Users> findAll() {
        return service.findAll();
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handle(Exception ex) {
        ex.printStackTrace();
        return ResponseEntity
                .status(INTERNAL_SERVER_ERROR)
                .body(ex.getMessage());
    }
}
