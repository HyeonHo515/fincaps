package com.community.community_chat.controller;

import com.community.community_chat.dto.LoginRequest;
import com.community.community_chat.dto.RegisterRequest;
import com.community.community_chat.dto.UserResponse;
import com.community.community_chat.entity.Role;
import com.community.community_chat.entity.User;
import com.community.community_chat.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {

        if (userRepository.existsByLoginId(request.getLoginId())) {
            return ResponseEntity.badRequest().body("이미 사용 중인 아이디입니다.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("이미 사용 중인 이메일입니다.");
        }

        User user = new User();

        user.setLoginId(request.getLoginId());
        user.setPassword(request.getPassword());
        user.setEmail(request.getEmail());
        user.setName(request.getName());
        user.setGrade(request.getGrade());
        user.setRole(Role.USER);

        userRepository.save(user);

        return ResponseEntity.ok("회원가입 성공");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        User user = userRepository.findByLoginId(request.getLoginId())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body("존재하지 않는 아이디입니다.");
        }

        if (!user.getPassword().equals(request.getPassword())) {
            return ResponseEntity.badRequest().body("비밀번호가 일치하지 않습니다.");
        }

        return ResponseEntity.ok(
                new UserResponse(
                        user.getUserId(),
                        user.getLoginId(),
                        user.getEmail(),
                        user.getName(),
                        user.getGrade(),
                        user.getRole().name()));
    }
}