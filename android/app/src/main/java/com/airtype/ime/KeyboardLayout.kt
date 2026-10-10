package com.airtype.ime

enum class KeyType {
    CHAR, ACTION
}

data class AndroidKey(
    val id: String,
    val label: String,
    val value: String,
    val type: KeyType = KeyType.CHAR,
    val widthWeight: Float = 1.0f
)

data class AndroidKeyboardRow(
    val rowId: String,
    val keys: List<AndroidKey>
)

data class AndroidLayout(
    val layoutId: String,
    val language: String, // "ar" or "en"
    val isRtl: Boolean,
    val rows: List<AndroidKeyboardRow>
) {
    companion object {
        fun getArabicLayout(): AndroidLayout {
            return AndroidLayout(
                layoutId = "ar_standard",
                language = "ar",
                isRtl = true,
                rows = listOf(
                    AndroidKeyboardRow(
                        "row_num",
                        listOf(
                            AndroidKey("1", "١", "1"),
                            AndroidKey("2", "٢", "2"),
                            AndroidKey("3", "٣", "3"),
                            AndroidKey("4", "٤", "4"),
                            AndroidKey("5", "٥", "5"),
                            AndroidKey("6", "٦", "6"),
                            AndroidKey("7", "٧", "7"),
                            AndroidKey("8", "٨", "8"),
                            AndroidKey("9", "٩", "9"),
                            AndroidKey("0", "٠", "0"),
                            AndroidKey("bksp", "⌫", "BACKSPACE", KeyType.ACTION, 1.4f)
                        )
                    ),
                    AndroidKeyboardRow(
                        "row_1",
                        listOf(
                            AndroidKey("dad", "ض", "ض"),
                            AndroidKey("sad", "ص", "ص"),
                            AndroidKey("thaa", "ث", "ث"),
                            AndroidKey("qaf", "ق", "ق"),
                            AndroidKey("fa", "ف", "ف"),
                            AndroidKey("ghayn", "غ", "غ"),
                            AndroidKey("ayn", "ع", "ع"),
                            AndroidKey("ha", "ه", "ه"),
                            AndroidKey("kha", "خ", "خ"),
                            AndroidKey("ha2", "ح", "ح"),
                            AndroidKey("jim", "ج", "ج"),
                            AndroidKey("dal", "د", "د")
                        )
                    ),
                    AndroidKeyboardRow(
                        "row_2",
                        listOf(
                            AndroidKey("shin", "ش", "ش"),
                            AndroidKey("seen", "س", "س"),
                            AndroidKey("ya", "ي", "ي"),
                            AndroidKey("ba", "ب", "ب"),
                            AndroidKey("lam", "ل", "ل"),
                            AndroidKey("alif", "ا", "ا"),
                            AndroidKey("teh", "ت", "ت"),
                            AndroidKey("noon", "ن", "ن"),
                            AndroidKey("meem", "م", "م"),
                            AndroidKey("kaf", "ك", "ك"),
                            AndroidKey("tah", "ط", "ط"),
                            AndroidKey("zah", "ظ", "ظ")
                        )
                    ),
                    AndroidKeyboardRow(
                        "row_3",
                        listOf(
                            AndroidKey("zal", "ذ", "ذ"),
                            AndroidKey("ra", "ر", "ر"),
                            AndroidKey("zay", "ز", "ز"),
                            AndroidKey("waw", "و", "و"),
                            AndroidKey("teh_m", "ة", "ة"),
                            AndroidKey("alif_m", "ى", "ى"),
                            AndroidKey("hamza", "ء", "ء"),
                            AndroidKey("alif_h", "أ", "أ"),
                            AndroidKey("alif_uh", "إ", "إ"),
                            AndroidKey("enter", "↵", "ENTER", KeyType.ACTION, 1.5f)
                        )
                    ),
                    AndroidKeyboardRow(
                        "row_bottom",
                        listOf(
                            AndroidKey("lang", "EN", "SWITCH_LANG", KeyType.ACTION, 1.4f),
                            AndroidKey("comma", "،", "،"),
                            AndroidKey("space", "مسافة — Space", "SPACE", KeyType.ACTION, 4.5f),
                            AndroidKey("dot", ".", "."),
                            AndroidKey("ques", "؟", "؟")
                        )
                    )
                )
            )
        }

        fun getEnglishLayout(): AndroidLayout {
            return AndroidLayout(
                layoutId = "en_qwerty",
                language = "en",
                isRtl = false,
                rows = listOf(
                    AndroidKeyboardRow(
                        "row_num",
                        listOf(
                            AndroidKey("1", "1", "1"),
                            AndroidKey("2", "2", "2"),
                            AndroidKey("3", "3", "3"),
                            AndroidKey("4", "4", "4"),
                            AndroidKey("5", "5", "5"),
                            AndroidKey("6", "6", "6"),
                            AndroidKey("7", "7", "7"),
                            AndroidKey("8", "8", "8"),
                            AndroidKey("9", "9", "9"),
                            AndroidKey("0", "0", "0"),
                            AndroidKey("bksp", "⌫", "BACKSPACE", KeyType.ACTION, 1.4f)
                        )
                    ),
                    AndroidKeyboardRow(
                        "row_1",
                        listOf(
                            AndroidKey("q", "Q", "q"),
                            AndroidKey("w", "W", "w"),
                            AndroidKey("e", "E", "e"),
                            AndroidKey("r", "R", "r"),
                            AndroidKey("t", "T", "t"),
                            AndroidKey("y", "Y", "y"),
                            AndroidKey("u", "U", "u"),
                            AndroidKey("i", "I", "i"),
                            AndroidKey("o", "O", "o"),
                            AndroidKey("p", "P", "p")
                        )
                    ),
                    AndroidKeyboardRow(
                        "row_2",
                        listOf(
                            AndroidKey("a", "A", "a"),
                            AndroidKey("s", "S", "s"),
                            AndroidKey("d", "D", "d"),
                            AndroidKey("f", "F", "f"),
                            AndroidKey("g", "G", "g"),
                            AndroidKey("h", "H", "h"),
                            AndroidKey("j", "J", "j"),
                            AndroidKey("k", "K", "k"),
                            AndroidKey("l", "L", "l")
                        )
                    ),
                    AndroidKeyboardRow(
                        "row_3",
                        listOf(
                            AndroidKey("caps", "⇧", "CAPS_LOCK", KeyType.ACTION, 1.2f),
                            AndroidKey("z", "Z", "z"),
                            AndroidKey("x", "X", "x"),
                            AndroidKey("c", "C", "c"),
                            AndroidKey("v", "V", "v"),
                            AndroidKey("b", "B", "b"),
                            AndroidKey("n", "N", "n"),
                            AndroidKey("m", "M", "m"),
                            AndroidKey("enter", "↵", "ENTER", KeyType.ACTION, 1.5f)
                        )
                    ),
                    AndroidKeyboardRow(
                        "row_bottom",
                        listOf(
                            AndroidKey("lang", "عربي", "SWITCH_LANG", KeyType.ACTION, 1.4f),
                            AndroidKey("comma", ",", ","),
                            AndroidKey("space", "Space", "SPACE", KeyType.ACTION, 4.5f),
                            AndroidKey("dot", ".", "."),
                            AndroidKey("ques", "?", "?")
                        )
                    )
                )
            )
        }
    }
}
