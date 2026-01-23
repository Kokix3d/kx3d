// Houdini Courses data
const houdiniCourses = window.houdiniCourses = [
  {
    id: 1,
    title: "DoubleJump Academy - Mad Max War Rig Explosion",
    folder: "DoubleJump Academy - Mad Max War Rig Explosion",
    image: "Courses/DoubleJump Academy - Mad Max War Rig Explosion/1.jpg",
    images: [
      "Courses/DoubleJump Academy - Mad Max War Rig Explosion/1.jpg",
      "Courses/DoubleJump Academy - Mad Max War Rig Explosion/6855c0e6ab9fa13e329b53af_67d42bf747340782bbcba4d9_MADMAX-3-min.png",
      "Courses/DoubleJump Academy - Mad Max War Rig Explosion/6855c0e6ab9fa13e329b53b7_67d42bf8db123c6b4946bb4e_MADMAX-8-min.png",
      "Courses/DoubleJump Academy - Mad Max War Rig Explosion/6855c0e6ab9fa13e329b53c5_67d42bf845bd43980da0a616_MADMAX-2-min.png",
      "Courses/DoubleJump Academy - Mad Max War Rig Explosion/6855c0e6ab9fa13e329b5400_67d42bf8199a4e774f9aab51_MADMAX-5-min.png"
    ]
  },
  {
    id: 2,
    title: "Legendary Threads - MFXLabs",
    folder: "Legendary Threads - MFXLabs",
    image: "Courses/Legendary Threads - MFXLabs/1.jpg",
    images: [
      "Courses/Legendary Threads - MFXLabs/1.jpg",
      "Courses/Legendary Threads - MFXLabs/Screenshot 2026-01-22 183749.png",
      "Courses/Legendary Threads - MFXLabs/Screenshot 2026-01-22 183755.png",
      "Courses/Legendary Threads - MFXLabs/Screenshot 2026-01-22 183801.png",
      "Courses/Legendary Threads - MFXLabs/Screenshot 2026-01-22 183805.png",
      "Courses/Legendary Threads - MFXLabs/Screenshot 2026-01-22 183810.png"
    ]
  },
  {
    id: 3,
    title: "Master Rigging APEX in Houdini",
    folder: "Master Rigging APEX in Houdini",
    image: "Courses/Master Rigging APEX in Houdini/1.jpg",
    images: [
      "Courses/Master Rigging APEX in Houdini/1.jpg",
      "Courses/Master Rigging APEX in Houdini/687219e9df4cbfc5610de0e6_Screenshot 2025-06-14 at 9.55.54 AM-min-p-1080.png",
      "Courses/Master Rigging APEX in Houdini/687219f14c28fd3477581727_Screenshot 2025-06-14 at 9.56.33 AM-min-p-1080.png",
      "Courses/Master Rigging APEX in Houdini/687219f72d18853d765a3d55_Screenshot 2025-06-14 at 8.32.26 AM-min-p-1080.png",
      "Courses/Master Rigging APEX in Houdini/687219fd37235a3e6d4ae7ea_Screenshot 2025-06-14 at 9.52.28 AM-min-p-1080.png",
      "Courses/Master Rigging APEX in Houdini/68721a1a81428b13e9f1296a_Screenshot 2025-06-04 at 3.00.19 PM-min-p-1080.png"
    ]
  },
  {
    id: 4,
    title: "Houdini for Games in Unreal Engine",
    folder: "Houdini for Games in Unreal Engine",
    image: "Courses/Houdini for Games in Unreal Engine/1.png",
    images: [
      "Courses/Houdini for Games in Unreal Engine/1.png",
      "Courses/Houdini for Games in Unreal Engine/6855c0e42a13d714fdf28ce8_67d44050cd3d4512a47257d6_5_ProductionHDA_B.png",
      "Courses/Houdini for Games in Unreal Engine/6855c0e52a13d714fdf28cf0_67d4404ffd8b5ad055b7d2b3_Screenshot20143853.png",
      "Courses/Houdini for Games in Unreal Engine/6855c0e52a13d714fdf28cf6_67d4404fba14dae57f56ddb9_HfGUE%20(2).png",
      "Courses/Houdini for Games in Unreal Engine/6855c0e52a13d714fdf28cf9_67d44050f2547f82558ca82c_Screenshot20143540.png",
      "Courses/Houdini for Games in Unreal Engine/6855c0e52a13d714fdf28cfd_67d4404f74c146c144cc59e6_Screenshot20143737.png"
    ]
  }
];

// Download links for courses (add when available)
const courseDownloadLinksMap = {
  "DoubleJump Academy - Mad Max War Rig Explosion": "",
  "Legendary Threads - MFXLabs": "",
  "Houdini for Games in Unreal Engine": ""
  // Add download links here when available
  // Format: "Course Name": "Download Link"
};

// Multiple Download Links Mapping (For courses with multiple parts)
// Format: "Course Name": { part1: "Link 1", part2: "Link 2" }
const multipleCourseDownloadLinksMap = {
  "Master Rigging APEX in Houdini": {
    part1: "https://direct-link.net/1422046/9N4jZFqRO5iB",
    part2: "https://link-center.net/1422046/qcfmHPI0NajI",
    part3: "https://link-target.net/1422046/p4UGdxfvR7bs",
    part4: "https://direct-link.net/1422046/bJXq2daXjCPx",
    part5: "https://link-target.net/1422046/pmfzFylwT4fI"
  }
  // Add courses with multiple parts here
  // Format: "Course Name": { part1: "Link 1", part2: "Link 2", ... }
};
