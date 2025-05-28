
import Canvas from '../Canvas/Canvas';
import { ThemeProvider } from '../Theme/ThemeContext';

const Index = () => {
  return (
    <ThemeProvider>
      <div className="w-full h-screen">
        <Canvas />
      </div>
    </ThemeProvider>
  );
};

export default Index;
