package com.kuet.authentication_authorization.service;

import com.kuet.authentication_authorization.model.Users;
import com.kuet.authentication_authorization.repo.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class RegisterService {
    @Autowired
    private UserRepo repo;

    private BCryptPasswordEncoder bCryptPasswordEncoder = new BCryptPasswordEncoder(12);
    public Users register(Users user)
    {
        user.setPassword(bCryptPasswordEncoder.encode(user.getPassword()));
        return repo.save(user);

    }
}
