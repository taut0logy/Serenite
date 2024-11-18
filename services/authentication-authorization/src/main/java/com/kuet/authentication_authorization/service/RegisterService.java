package com.kuet.authentication_authorization.service;

import com.kuet.authentication_authorization.model.Users;
import com.kuet.authentication_authorization.repo.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class RegisterService {

    @Autowired
    private UserRepo repo;

    @Autowired
    private AuthenticationManager authManager;

    @Autowired
    private JWTService jwtService;

    private final BCryptPasswordEncoder bCryptPasswordEncoder = new BCryptPasswordEncoder(12);

    public Users register(Users user) {
        // Encode the password before saving the user
        user.setPassword(bCryptPasswordEncoder.encode(user.getPassword()));
        return repo.save(user);
    }

    public String verify(Users user) {
        try {
            // Authenticate user credentials
            Authentication authentication = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            user.getUserName(),
                            user.getPassword()
                    )
            );

            // Check if authentication was successful
            if (authentication.isAuthenticated()) {
                return jwtService.generateToken(user.getUserName());
            } else {
                return "Authentication failed.";
            }
        } catch (AuthenticationException e) {
            // Handle failed authentication
            return "Authentication failed: " + e.getMessage();
        }
    }
}
