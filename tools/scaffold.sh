#!/usr/bin/env bash
# يُشغَّل داخل GitHub Actions فقط: يجهّز مشروع Next.js بالمكتبات، ويرجع الملفات كـ artifact.
set -uo pipefail
LOG=/tmp/scaffold.log; : > "$LOG"
step() { echo "::group::$1"; echo "== $1" >> "$LOG"; }
end() { echo "::endgroup::"; }

step "create-next-app"
npx --yes create-next-app@latest app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes 2>&1 | tail -20 | tee -a "$LOG"
end
cd app

step "shadcn init (rtl)"
npx --yes shadcn@latest init --rtl -y -d 2>&1 | tail -20 | tee -a "$LOG" || npx --yes shadcn@latest init -y -d 2>&1 | tail -20 | tee -a "$LOG"
end

step "shadcn components"
npx --yes shadcn@latest add -y -o button card dialog sheet tabs progress skeleton sonner input input-otp avatar badge dropdown-menu table chart tooltip separator scroll-area toggle label select textarea switch 2>&1 | tail -30 | tee -a "$LOG"
end

step "libs"
npm i motion lenis gsap @gsap/react three @lottiefiles/dotlottie-react canvas-confetti next-themes 2>&1 | tail -5 | tee -a "$LOG"
npm i -D @types/three @types/canvas-confetti @playwright/test 2>&1 | tail -5 | tee -a "$LOG"
end

step "magic ui"
for c in number-ticker shine-border sparkles-text confetti magic-card shimmer-button animated-gradient-text blur-fade bento-grid border-beam meteors particles ripple-button cool-mode animated-circular-progress-bar; do
  npx --yes shadcn@latest add -y -o "https://magicui.design/r/$c.json" >> "$LOG" 2>&1 && echo "ok $c" | tee -a "$LOG" || echo "FAIL $c" | tee -a "$LOG"
done
end

step "react bits"
for c in SplitText-TS-TW CountUp-TS-TW ClickSpark-TS-TW StarBorder-TS-TW Magnet-TS-TW SpotlightCard-TS-TW GlareHover-TS-TW; do
  npx --yes shadcn@latest add -y -o "https://reactbits.dev/r/$c" >> "$LOG" 2>&1 && echo "ok $c" | tee -a "$LOG" || echo "FAIL $c" | tee -a "$LOG"
done
end

step "fluent 3d icons"
mkdir -p public/3d
dl() { # $1 folder name in fluentui-emoji, $2 file stem, $3 output name
  local u="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/$(printf %s "$1" | sed 's/ /%20/g')/3D/$2_3d.png"
  curl -fsSL "$u" -o "public/3d/$3.png" && echo "ok $3" | tee -a "$LOG" || echo "FAIL $3 ($u)" | tee -a "$LOG"
}
dl "Crescent moon" crescent_moon moon
dl "Star" star star
dl "Glowing star" glowing_star glowing-star
dl "Sparkles" sparkles sparkles
dl "Trophy" trophy trophy
dl "Books" books books
dl "Open book" open_book open-book
dl "Headphone" headphone headphone
dl "Video game" video_game game
dl "Light bulb" light_bulb bulb
dl "Wrapped gift" wrapped_gift gift
dl "Fire" fire fire
dl "Kaaba" kaaba kaaba
dl "Mosque" mosque mosque
dl "Spiral calendar" spiral_calendar calendar
dl "Bar chart" bar_chart chart
dl "Clipboard" clipboard clipboard
dl "Memo" memo memo
dl "Bell" bell bell
dl "Busts in silhouette" busts_in_silhouette students
dl "Studio microphone" studio_microphone mic
dl "Check mark button" check_mark_button check
dl "Party popper" party_popper party
dl "Gem stone" gem_stone gem
dl "Rocket" rocket rocket
dl "Prayer beads" prayer_beads beads
dl "Hourglass not done" hourglass_not_done hourglass
dl "Graduation cap" graduation_cap cap
dl "Thinking face" thinking_face thinking
dl "Package" package package
dl "Gear" gear gear
dl "Key" key key
dl "Speech balloon" speech_balloon speech
dl "Medal sports medal" sports_medal medal
dl "1st place medal" 1st_place_medal medal1
dl "2nd place medal" 2nd_place_medal medal2
dl "3rd place medal" 3rd_place_medal medal3
dl "Crown" crown crown
dl "Water wave" water_wave wave
dl "Sun" sun sun
dl "Waving hand" waving_hand_default wave-hand
end

step "versions"
node -v | tee -a "$LOG"; npm ls --depth=0 2>/dev/null | tee -a "$LOG"
end
cp "$LOG" ./scaffold.log
