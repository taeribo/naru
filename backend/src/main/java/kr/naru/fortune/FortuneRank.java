package kr.naru.fortune;

enum FortuneRank {
    GREAT_LUCK("大吉", "대길"),
    LUCK("吉", "길"),
    MEDIUM_LUCK("中吉", "중길"),
    SMALL_LUCK("小吉", "소길"),
    LATER_LUCK("末吉", "말길"),
    CAUTION("凶", "흉");

    private final Label label;

    FortuneRank(String hanja, String name) {
        label = new Label(hanja, name);
    }

    static FortuneRank forTone(FortuneTone tone, boolean greatLuck) {
        return switch (tone) {
            case HOPE -> greatLuck ? GREAT_LUCK : LUCK;
            case ADVICE -> MEDIUM_LUCK;
            case COMFORT -> SMALL_LUCK;
            case REFLECTION -> LATER_LUCK;
            case CAUTION -> CAUTION;
        };
    }

    Label label() {
        return label;
    }

    record Label(String hanja, String name) {}
}
