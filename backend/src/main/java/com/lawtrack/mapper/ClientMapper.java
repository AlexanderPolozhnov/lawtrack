package com.lawtrack.mapper;

import com.lawtrack.dto.request.CreateClientRequest;
import com.lawtrack.dto.response.ClientResponse;
import com.lawtrack.entity.Client;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ClientMapper {
    @Mapping(target = "statusDisplayName", expression = "java(client.getStatus().getDisplayName())")
    ClientResponse toResponse(Client client);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Client toEntity(CreateClientRequest request);

    List<ClientResponse> toResponseList(List<Client> clients);
}
