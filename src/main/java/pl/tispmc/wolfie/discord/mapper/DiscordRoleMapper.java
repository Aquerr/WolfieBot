package pl.tispmc.wolfie.discord.mapper;

import net.dv8tion.jda.api.entities.Guild;
import net.dv8tion.jda.api.entities.ISnowflake;
import net.dv8tion.jda.api.entities.Role;
import pl.tispmc.wolfie.common.model.Rank;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class DiscordRoleMapper
{
    public static Map<Long, Role> map(Guild guild, List<Rank> ranks)
    {
        Set<Long> rankIds = ranks.stream()
                .map(Rank::getId)
                .collect(Collectors.toSet());

        return guild.getRoles().stream()
                .filter(role -> rankIds.contains(role.getIdLong()))
                .collect(Collectors.toMap(ISnowflake::getIdLong, role -> role));
    }
}
