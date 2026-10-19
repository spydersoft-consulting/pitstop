import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

export const selectOption = async (user: UserEvent, trigger: Element, optionName: string) => {
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name: optionName }));
};
