package com.kuet.meet;

import com.kuet.meet.model.Users;
import com.kuet.meet.service.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MeetApplication {

	public static void main(String[] args) {
		SpringApplication.run(MeetApplication.class, args);
	}

	@Bean
	public CommandLineRunner commandLineRunner(UserService service) {
		return args -> {
			service.register(new Users("Ali", "ali@mail.com", "aaa", null));
			service.register(new Users("John", "john@mail.com", "aaa", null));
			service.register(new Users("Anny", "anna@mail.com", "aaa", null));
		};
	}
}
