package com.kuet.authentication_authorization.service;

import com.kuet.authentication_authorization.model.Users;
import com.kuet.authentication_authorization.model.UserPrincipal;
import com.kuet.authentication_authorization.repo.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsService implements org.springframework.security.core.userdetails.UserDetailsService {

    @Autowired
    private UserRepo repo;


    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
       Users user = repo.findByUsername(username);

       if(user==null)
       {
           System.out.println("User not found");
           throw new UsernameNotFoundException("User not found");
       }
        return new UserPrincipal(user);
    }
}
