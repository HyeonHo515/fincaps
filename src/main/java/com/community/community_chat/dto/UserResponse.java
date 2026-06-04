package com.community.community_chat.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserResponse {

    private Long userId;
    private String loginId;
    private String email;
    private String name;
    private String role;
}