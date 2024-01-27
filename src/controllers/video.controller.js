import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  if (sortBy) {
    sortOptions[sortBy] = sortType == "desc" ? -1 : 1;
  }

  let basequery = {};

  if (query) {
    basequery.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  try {
    const result = await Video.aggregate([
      {
        $match: {
          ...basequery,
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $sort: sortOptions,
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: parseInt(limit),
      },
    ]);

    console.log(result);

    return res.status(200).json(new ApiResponse(200, { result }, "Success"));
  } catch (e) {
    throw new ApiError(500, e.message);
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  try {
    const { title, description } = req.body;
    const userid = req.user._id;
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailFileLocalPath = req.files?.thumbnail?.[0]?.path;
    if (!videoFileLocalPath) throw new ApiError(400, "Video file required");
    if (!thumbnailFileLocalPath)
      throw new ApiError(400, "Thumbnail file required");
    const uploadVideoOnCloudinary =
      await uploadOnCloudinary(videoFileLocalPath);
    const uploadThubnailCloudinary = await uploadOnCloudinary(
      thumbnailFileLocalPath
    );

    if (!(uploadThubnailCloudinary || uploadVideoOnCloudinary))
      throw new ApiError(400, "Upload video error");
    const videoPublish = await Video.create({
      videoFile: uploadVideoOnCloudinary.url,
      thumbnail: uploadThubnailCloudinary.url,
      title,
      description,
      duration: uploadVideoOnCloudinary.duration,
      cloudinaryVideoID: uploadVideoOnCloudinary.public_id, //Adding these details to delete the video from the cloudinary also
      cloudinaryThumbnailID: uploadThubnailCloudinary.public_id,
      owner: userid,
    });
    if (!videoPublish)
      throw ApiError(500, "Something went wrong while uploading");
    return res
      .status(200)
      .json(new ApiResponse(200, { videoPublish }, "Success"));
  } catch (e) {
    throw new ApiError(400, e.message);
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  try {
    const { videoId } = req.params;
    const videoUrl = await Video.findById(videoId);
    if (!videoUrl) throw new ApiError(404, "Video not found");

    return res
      .status(200)
      .json(
        new ApiResponse(200, { videoUrl }, "Successfully retrieved Videos ")
      );
  } catch (e) {
    throw new ApiError(404, e.message);
  }
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  try {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailFile = req.file?.path;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "This video id is not valid");
    }
    // if any feild not provide
    if (
      !(
        thumbnailFile ||
        !(!title || title?.trim() === "") ||
        !(!description || description?.trim() === "")
      )
    ) {
      throw new ApiError(400, "update fields are required");
    }

    // find video
    const previousVideo = await Video.findOne({
      _id: videoId,
    });
    if (!previousVideo) {
      throw new ApiError(404, "video not found");
    }

    let updateFields = {
      $set: {
        title,
        description,
      },
    };

    // if thumbnail provided delete the previous one and upload new on
    let thumbnailUploadOnCloudinary;
    if (thumbnailFile) {
      await deleteOnCloudinary(previousVideo.thumbnail?.public_id);

      // upload new one
      thumbnailUploadOnCloudinary = await uploadOnCloudinaary(thumbnailFile);

      if (!thumbnailUploadOnCloudinary) {
        throw new ApiError(
          500,
          "something went wrong while updating thumbnail on cloudinary !!"
        );
      }

      updateFields.$set = {
        public_id: thumbnailUploadOnCloudinary.public_id,
        url: thumbnailUploadOnCloudinary.url,
      };
    }

    const updatedVideoDetails = await Video.findByIdAndUpdate(
      videoId,
      updateFields,
      {
        new: true,
      }
    );

    if (!updatedVideoDetails) {
      throw new ApiError(
        500,
        "something went wrong while updating video details"
      );
    }

    //retrun responce
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { updatedVideoDetails },
          "Video details updated successfully!"
        )
      );
  } catch (e) {
    throw new ApiError(500, "Error uploading: " + e.message);
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  //TODO: delete video
  try {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "This video id is not valid");
    }

    // find video in db
    const video = await Video.findById({
      _id: videoId,
    });

    if (!video) {
      throw new ApiError(404, "video not found");
    }

    if (video.videoOwner.toString() !== req.user._id.toString()) {
      throw new ApiError(
        403,
        "You don't have permission to delete this video!"
      );
    }

    // delete video and thumbnail in cloudinary
    if (video.videoFile) {
      await deleteOnCloudinary(video.videoFile.public_id, "video");
    }

    if (video.thumbnail) {
      await deleteOnCloudinary(video.thumbnail.public_id);
    }

    const deleteResponce = await Video.findByIdAndDelete(videoId);

    if (!deleteResponce) {
      throw new ApiError(500, "something went wrong while deleting video !!");
    }

    // return responce
    return res
      .status(200)
      .json(
        new ApiResponse(200, deleteResponce, "video deleted successfully!!")
      );
  } catch (e) {
    throw new ApiError(404, e.message);
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "This video id is not valid");
    }

    // find video in db
    const video = await Video.findById({
      _id: videoId,
    });

    if (!video) {
      throw new ApiError(404, "video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
      throw new ApiError(
        403,
        "You don't have permission to toggle this video!"
      );
    }

    // toggle video status
    video.isPublished = !video.isPublished;

    await video.save({ validateBeforeSave: false });

    //return responce
    return res
      .status(200)
      .json(new ApiResponse(200, video, "video toggle successfully!!"));
  } catch (e) {
    throw new ApiError(400, e.message || "Unable to update video");
  }
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
