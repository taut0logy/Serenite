package com.kuet.authentication_authorization.controller;

import com.kuet.authentication_authorization.model.Users;
import com.kuet.authentication_authorization.repo.UserRepo;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
public class UserController {

    @Autowired
    UserRepo userRepo;

    @GetMapping("/users")
    public List<Users> getUsers() {
        return userRepo.findAll();
    }

    @GetMapping("/csrf-token")
    public CsrfToken getCsrfToken(HttpServletRequest request){
        return (CsrfToken) request.getAttribute("_csrf");
    }

    @PostMapping("/users")
    public Users addUser(@RequestBody Users user) {
        return userRepo.save(user);
    }

}
