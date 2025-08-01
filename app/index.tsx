import * as React from "react";
import { ScrollView, View } from "react-native";
import Animated, {
  FadeInUp,
  FadeOutDown,
  LayoutAnimationConfig,
} from "react-native-reanimated";
import { ThemeToggle } from "~/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Text } from "~/components/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Info } from "~/lib/icons/Info";
import { useProgressStore } from "~/store/progressStore";
import { useScrollStore } from "~/store/scrollStore";

const GITHUB_AVATAR_URI =
  "https://i.pinimg.com/originals/ef/a2/8d/efa28d18a04e7fa40ed49eeb0ab660db.jpg";

export default function Screen() {
  // zustand stores 사용
  const { progress, updateProgressValue, resetProgress } = useProgressStore();
  const { scrollEnabled, handleContentSizeChange, setScreenHeight } =
    useScrollStore();

  return (
    <ScrollView
      className="flex-1 bg-background m-safe"
      contentContainerClassName="gap-5 px-6"
      scrollEnabled={scrollEnabled}
      onContentSizeChange={handleContentSizeChange}
      onLayout={(event) => setScreenHeight(event.nativeEvent.layout.height)}
      showsVerticalScrollIndicator={scrollEnabled}
    >
      {/* 커스텀 헤더 */}
      <View className="flex-row justify-between items-center py-4">
        <Text className="text-2xl font-bold text-foreground">Starter Base</Text>
        <ThemeToggle />
      </View>

      {/* 메인 콘텐츠 */}
      <View className="justify-center items-center">
        <Card className="w-full max-w-sm p-6 rounded-2xl">
          <CardHeader className="items-center">
            <Avatar alt="Rick Sanchez's Avatar" className="w-24 h-24">
              <AvatarImage source={{ uri: GITHUB_AVATAR_URI }} />
              <AvatarFallback>
                <Text>RS</Text>
              </AvatarFallback>
            </Avatar>
            <View className="p-3" />
            <CardTitle className="pb-2 text-center">Rick Sanchez</CardTitle>
            <View className="flex-row">
              <CardDescription className="text-base font-semibold">
                Scientist
              </CardDescription>
              <Tooltip delayDuration={150}>
                <TooltipTrigger className="px-2 pb-0.5 active:opacity-50">
                  <Info
                    size={14}
                    strokeWidth={2.5}
                    className="w-4 h-4 text-foreground/70"
                  />
                </TooltipTrigger>
                <TooltipContent className="py-2 px-4 shadow">
                  <Text className="native:text-lg">Freelance</Text>
                </TooltipContent>
              </Tooltip>
            </View>
          </CardHeader>
          <CardContent>
            <View className="flex-row justify-around gap-3">
              <View className="items-center">
                <Text className="text-sm text-muted-foreground">Dimension</Text>
                <Text className="text-xl font-semibold">C-137</Text>
              </View>
              <View className="items-center">
                <Text className="text-sm text-muted-foreground">Age</Text>
                <Text className="text-xl font-semibold">70</Text>
              </View>
              <View className="items-center">
                <Text className="text-sm text-muted-foreground">Species</Text>
                <Text className="text-xl font-semibold">Human</Text>
              </View>
            </View>
          </CardContent>
          <CardFooter className="flex-col gap-3 pb-0">
            <View className="flex-row items-center overflow-hidden">
              <Text className="text-sm text-muted-foreground">
                Productivity:
              </Text>
              <LayoutAnimationConfig skipEntering>
                <Animated.View
                  key={progress}
                  entering={FadeInUp}
                  exiting={FadeOutDown}
                  className="w-11 items-center"
                >
                  <Text className="text-sm font-bold text-sky-600">
                    {progress}%
                  </Text>
                </Animated.View>
              </LayoutAnimationConfig>
            </View>
            <Progress
              value={progress}
              className="h-2"
              indicatorClassName="bg-sky-600"
            />
            <View />
            <View className="flex-row gap-3 w-full">
              <Button
                variant="outline"
                className="shadow shadow-foreground/5 flex-1"
                onPress={updateProgressValue}
              >
                <Text>Update</Text>
              </Button>
              <Button
                variant="outline"
                className="shadow shadow-foreground/5 flex-1"
                onPress={resetProgress}
              >
                <Text>Reset</Text>
              </Button>
            </View>
          </CardFooter>
        </Card>
      </View>

      {/* Spacer to push button to bottom */}
      <View className="flex-1" />

      {/* 추가 버튼 섹션 */}
      <View className="px-4">
        <Button
          variant="default"
          className="w-full"
          onPress={() => console.log("Bottom button pressed!")}
        >
          <Text>추가 기능</Text>
        </Button>
      </View>

      <View className="h-96 bg-red-950" />
    </ScrollView>
  );
}
