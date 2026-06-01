package com.community.community_chat.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChatChannelResponse {
    private Long channelId;
    private Long roomId;
    private String channelName;
}