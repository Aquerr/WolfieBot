package pl.tispmc.wolfie.discord.command;

import net.dv8tion.jda.api.entities.Member;
import net.dv8tion.jda.api.entities.MessageEmbed;
import net.dv8tion.jda.api.events.interaction.command.SlashCommandInteractionEvent;
import net.dv8tion.jda.api.requests.restaction.interactions.ReplyCallbackAction;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.tispmc.wolfie.common.model.UserData;
import pl.tispmc.wolfie.common.service.UserDataService;
import pl.tispmc.wolfie.discord.command.exception.CommandException;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DailyExpCommandTest
{
    private static final long MEMBER_ID = 1;
    private static final int MEMBER_BASE_EXP = 25;
    private static final int MEMBER_DAILY_STREAK = 1;

    @Mock
    private UserDataService userDataService;

    @InjectMocks
    private DailyExpCommand dailyExpCommand;

    @Captor
    private ArgumentCaptor<UserData> userDataArgumentCaptor;

    @Test
    void shouldReturnCorrectAliases()
    {
        // given
        // when
        // then
        assertThat(dailyExpCommand.getAliases()).containsExactly("daily");
    }

    @Test
    void shouldReturnCorrectDescription()
    {
        // given
        // when
        // then
        assertThat(dailyExpCommand.getDescription()).isEqualTo("Zgarnij dzienną porcję darmowego expa");
    }

    @Test
    void shouldThrowCommandExceptionWhenDailyAlreadyUsedToday()
    {
        // given
        SlashCommandInteractionEvent event = mock(SlashCommandInteractionEvent.class);
        Member member = mock(Member.class);

        given(member.getIdLong()).willReturn(MEMBER_ID);
        given(event.getMember()).willReturn(member);
        given(userDataService.find(MEMBER_ID)).willReturn(prepareUserData(LocalDateTime.now()));

        // when
        Exception exception = catchException(() -> dailyExpCommand.onSlashCommand(event));

        // then
        assertThat(exception).isInstanceOf(CommandException.class);
        assertThat(exception.getMessage()).isEqualTo("Dzienny exp już wykorzystany!");
    }

    @Test
    void shouldGiveDailyExp()
    {
        // given
        SlashCommandInteractionEvent event = mock(SlashCommandInteractionEvent.class);
        Member member = mock(Member.class);
        ReplyCallbackAction replyCallbackAction = mock(ReplyCallbackAction.class);

        given(member.getIdLong()).willReturn(MEMBER_ID);
        given(event.getMember()).willReturn(member);
        given(userDataService.find(MEMBER_ID)).willReturn(prepareUserData(LocalDateTime.now().minusDays(1)));
        given(event.deferReply()).willReturn(replyCallbackAction);
        given(replyCallbackAction.addEmbeds(any(MessageEmbed.class))).willReturn(replyCallbackAction);

        // when
        dailyExpCommand.onSlashCommand(event);

        // then
        verify(userDataService).save(userDataArgumentCaptor.capture());

        UserData updatedUserData = userDataArgumentCaptor.getValue();
        assertThat(updatedUserData.getExp()).isGreaterThan(MEMBER_BASE_EXP);
        assertThat(updatedUserData.getExpClaims().getDailyExpStreak()).isEqualTo(MEMBER_DAILY_STREAK + 1);
        assertThat(updatedUserData.getExpClaims().getLastDailyExpClaim()).hasDayOfMonth(LocalDateTime.now().getDayOfMonth());
    }

    private static UserData prepareUserData(LocalDateTime lastDailyExpClaimDate)
    {
        return UserData.builder()
                .userId(MEMBER_ID)
                .exp(MEMBER_BASE_EXP)
                .expClaims(UserData.ExpClaims.builder()
                        .lastDailyExpClaim(lastDailyExpClaimDate)
                        .dailyExpStreak(MEMBER_DAILY_STREAK)
                        .build())
                .build();
    }
}