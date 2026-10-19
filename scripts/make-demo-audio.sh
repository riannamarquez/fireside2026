#!/usr/bin/env bash
# Regenerates the seed letter audio in public/demo/ with macOS `say`.
# Ama speaks Taiwanese Mandarin; the book shows her words in English.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/demo
mkdir -p "$OUT"
AMA="Grandma (Chinese (Taiwan))"

clip() { say -v "$2" -r "${4:-165}" --file-format=m4af --data-format=aac -o "$OUT/$1.m4a" "$3"; }

clip pc1a "$AMA" "我小時候在台南，跟二十個表兄弟姊妹住在阿公的房子裡。夏天晚上太熱了，我們就把竹蓆搬到院子裡，睡在星星下面。"
clip pc1b "$AMA" "過年前，阿嬤要煮三天的菜。我跟阿偉搶著包水餃。我包的最漂亮。"
clip pc2a "$AMA" "一九七五年，我們帶著兩個皮箱來到加州。我跟你阿公在麵包店樓上租了一個房間。我在成衣工廠做衣服，從早上七點做到天黑。"
clip pc2b "$AMA" "我的英文是看電視學的。每天晚上我看新聞，一個字一個字跟著念，聽不懂也念。"
clip pc3a "$AMA" "美美小時候，每個禮拜天我們都在廚房桌上一起包水餃。現在莉莉跟我一起包，她的手比我還快。"
clip pc3b "$AMA" "秘訣是一點點薑，還有很多耐心。寫下來，不要忘記。"
clip pa1 "$AMA" "莉莉，我們剛來加州的時候，我難過了很久。醫生說那是憂鬱症。有時候早上我起不來，你媽媽那麼小，就自己做早餐。"
clip pa2 "$AMA" "這件事我從來沒有跟外人說過。那個時候，大家都不講這種事。鄰居太太每個禮拜都帶湯來，陪我坐。慢慢地，我好起來了。"
clip psA1 "$AMA" "莉莉，十八歲生日快樂。你長大了，所以我想讓你知道我的這一部分。"
clip psA2 "$AMA" "我希望你明白，難過不是軟弱。如果你也有這種感覺，要跟人說。跟你媽媽說。如果我還在，就跟我說。"
clip pb1 "$AMA" "一九六二年的一個晚上，警察來我們台南的家，把我爸爸抓走了。因為他在工作的時候說了一句話，坐牢坐了四年。大家叫我們永遠不要提這件事。"
clip pb2 "$AMA" "阿偉怪媽媽不說話，他們二十年沒有講話。我要你們知道，那不是誰的錯。是那個時代。"
clip psB1 "$AMA" "我跟你們說這些，是因為我們家背著這個沉默太久了。我不要你們也背著。"
clip pp1 "$AMA" "有一件關於餐廳的錢，我從來沒有跟大衛說過。一九九四年餐廳關門的時候，我把所有的存款借給阿偉，他一直沒有還。"
clip reply-lily "Samantha" "Thank you, Ama. I wrote down the recipe. I'll teach my kids someday." 175

echo "Wrote $(ls "$OUT" | wc -l | tr -d ' ') clips to $OUT"
