package com.community.community_chat.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatMessageRequest {
    private Long roomId;
    private Long channelId;
    private Long senderId;
    private String content;
}