/* Original Star Post drawing example. Requires raylib when used in a game.
 * Scan this file in Handheld Screen Studio and choose the Game Boy Advance
 * preview canvas (240 x 160). The preview font and colors are approximate.
 * Call star_post_screen() between the host's BeginDrawing()/EndDrawing().
 */
#include <raylib.h>

void star_post_screen(void)
{
    DrawRectangle(0, 0, 240, 160, BLACK);
    DrawText("STAR POST", 12, 12, 14, GOLD);
    DrawRectangleLines(8, 36, 224, 112, PURPLE);
    DrawText("DELIVERY DESK", 20, 48, 7, WHITE);
    DrawText("ROUTE READY", 20, 64, 7, GREEN);
}
