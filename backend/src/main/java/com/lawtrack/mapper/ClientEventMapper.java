package com.lawtrack.mapper;

import com.lawtrack.dto.response.ClientEventResponse;
import com.lawtrack.entity.ClientEvent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.List;

@Mapper(componentModel = "spring")
public interface ClientEventMapper {

    @Mapping(target = "clientId", source = "client.id")
    ClientEventResponse toResponse(ClientEvent event);

    List<ClientEventResponse> toResponseList(List<ClientEvent> events);
}
