import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { fn, expect, userEvent, within } from 'storybook/test';

import { Header } from './Header';

const meta = {
  title: 'Example/Header',
  component: Header,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen',
  },
  args: {
    onLogin: fn(),
    onLogout: fn(),
    onCreateAccount: fn(),
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedIn: Story = {
  args: {
    user: {
      name: 'Jane Doe',
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const logoutBtn = canvas.getByRole('button', { name: /log out/i });
    await userEvent.click(logoutBtn);
    await expect(args.onLogout).toHaveBeenCalled();
  },
};

export const LoggedOut: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const loginBtn = canvas.getByRole('button', { name: /log in/i });
    await userEvent.click(loginBtn);
    await expect(args.onLogin).toHaveBeenCalled();
  },
};
