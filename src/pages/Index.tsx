
import Canvas from '../Canvas/Canvas';
import { ThemeProvider } from '../Theme/ThemeContext';
import UserHeader from '../components/UserHeader';
import NavigationBar from '../components/NavigationBar';

const Index = () => {
  return (
    <ThemeProvider>
      <div className="w-full h-screen relative">
        <UserHeader />
        <NavigationBar />
        <Canvas />
      </div>
    </ThemeProvider>
  );
};

export default Index;
