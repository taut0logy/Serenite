package com.kuet.authentication_authorization.controller;

import com.kuet.authentication_authorization.model.Users;
import com.kuet.authentication_authorization.service.RegisterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RegisterController {

    @Autowired
    private RegisterService registerService;

    @PostMapping("/register")
    public Users register(@RequestBody Users user)
    {
        return registerService.register(user);
    }

    @PostMapping("/login")
    public String login(@RequestBody Users user)
    {
        return registerService.verify(user);
    }
}
