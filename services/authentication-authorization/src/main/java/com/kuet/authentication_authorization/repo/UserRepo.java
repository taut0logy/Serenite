package com.kuet.authentication_authorization.repo;

import com.kuet.authentication_authorization.model.Users;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepo extends JpaRepository<Users,Integer>{

    Users findByUsername(String username);
}
