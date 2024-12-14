package pl.tispmc.wolfie.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class CommonConfig
{
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
