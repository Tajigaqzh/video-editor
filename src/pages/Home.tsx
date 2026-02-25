import Split from "react-split";
import MediaLibrary from "@/components/MediaLibrary";
import Timeline from "@/components/Timeline";
import VideoPreview from "@/components/VideoPreview/VideoPreview";
import "@/assets/css/split.css";

function Home() {
  return (
    <div className="h-full w-full overflow-hidden" style={{ backgroundColor: '#141414' }}>
      {/* 垂直分割：上部（素材+预览+属性） | 下部（时间轴） */}
      <Split
        className="h-full w-full"
        sizes={[70, 30]}
        minSize={[400, 200]}
        gutterSize={8}
        direction="vertical"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* 上部：水平三栏布局 */}
        <div className="w-full overflow-hidden">
          <Split
            className="h-full w-full"
            sizes={[20, 60, 20]}
            minSize={[300, 200, 300]}
            maxSize={[600, Infinity, 600]}
            gutterSize={8}
            gutterAlign="center"
            snapOffset={0}
            direction="horizontal"
            style={{ display: 'flex', height: '100%' }}
          >
            {/* 左侧：素材库面板 */}
            <div className="h-full overflow-hidden">
              <MediaLibrary />
            </div>

            {/* 中间：视频预览区 */}
            <div className="h-full bg-black flex items-center justify-center overflow-hidden">
              <VideoPreview width={1280} height={720} />
            </div>

            {/* 右侧：属性面板 */}
            <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#141414' }}>
              <div className="px-4 py-3 border-b border-gray-700">
                <h2 className="text-white font-semibold">属性</h2>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center">
                {/* 属性面板内容区域 */}
              </div>
            </div>
          </Split>
        </div>

        {/* 下部：时间轴区域（占满整个宽度） */}
        <div className="w-full overflow-hidden" style={{ backgroundColor: '#141414' }}>
          <Timeline />
        </div>
      </Split>
    </div>
  );
}

export default Home;
