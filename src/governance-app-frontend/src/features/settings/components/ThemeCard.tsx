import { Monitor, Moon, Sun } from 'lucide-react';

import { Card, CardContent } from '@components/Card';
import { ToggleGroup, ToggleGroupItem } from '@components/ToggleGroup';
import { useTheme } from '@hooks/useTheme';

const ThemeCard = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="rounded-md px-4 py-6">
      <CardContent className="p-0">
        <div className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between md:gap-y-0">
          <div className="space-y-1">
            <p className="leading-none font-medium">Theme</p>
            <p className="text-sm text-muted-foreground">
              Select your preferred theme for the application.
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(value) => {
              if (value) setTheme(value as 'light' | 'dark' | 'system');
            }}
            className="rounded-md border"
          >
            <ToggleGroupItem value="light" aria-label="Toggle light">
              <Sun className="mr-2 h-4 w-4" />
              Light
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Toggle dark">
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="Toggle system">
              <Monitor className="mr-2 h-4 w-4" />
              System
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
};

export { ThemeCard };
