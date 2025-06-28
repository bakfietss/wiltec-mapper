
import Canvas from '../Canvas/Canvas';
import { ThemeProvider } from '../Theme/ThemeContext';
import UserHeader from '../components/UserHeader';

const Index = () => {
  return (
    <ThemeProvider>
      <div className="w-full h-screen relative">
        <UserHeader />
        <Canvas />
      </div>
    </ThemeProvider>
  );
};

export default Index;
