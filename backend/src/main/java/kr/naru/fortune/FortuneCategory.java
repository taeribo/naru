package kr.naru.fortune;

enum FortuneCategory {
    GENERAL("종합운"), LOVE("연애운"), WEALTH("재물운"), CAREER("직장운"),
    HEALTH("건강운"), FAMILY("가족운"), RELATIONSHIP("인간관계운"), GROWTH("성장운");

    private final String displayName;

    FortuneCategory(String displayName) {
        this.displayName = displayName;
    }

    String displayName() {
        return displayName;
    }
}
