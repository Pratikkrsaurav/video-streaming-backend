import { asyncHandler } from '../utils/asyncHandler.js';
import { apiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { apiResponse } from '../utils/apiResponse.js';

const generateAcessAndRefreshToken = async(userId) =>{
   try{
      const user = await User.findById(userId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };

   }catch(error){
      throw new apiError(500, "Something Went Wrong While Generating Tokens")
   }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    //validation - not empty
    // check user already exists: username, email
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    // create user object - create entry in db
    //remove password and refresh token from response
    //check for user creation success
    //return res

    const { username, password , email , fullName} = req.body
    console.log('email:', email)


    //for checking one by one
    // if(fullName == "") {
    //     throw new apiError(400, 'required fullName')
    // }

    if(
        [fullName, email, username, password].some((field) => field?.trim === "" )
    ){
        throw new apiError (400, "All Field are Required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
     })

     if(existedUser) {
        throw new apiError(409, "user with username or email already exist")
     }

     const avatarLocalPath = req.files?.avatar[0]?.path;
   //   const coverImageLocalPath = req.files?.coverImage[0]?.path

     let coverImageLocalPath;
     if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) 
      { coverImageLocalPath = req.files.coverImage[0].path
     

     if(!avatarLocalPath){
        throw new apiError(400, "Avatar file is required")
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath)
      const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   

      if(!avatar){
        throw new apiError(400, "Avatar file is required")
      }

      const user = await User.create({
        fullName,
        avatar: avatar.url || "",
        email,
        password,
        username: username.toLowerCase()
      })

     const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
     ) 

     if(!createdUser) {
        throw new apiError(500, "Something Went Wrong While Regestering The User")
     }

     return res.status(201).json(
        new apiResponse(200, createdUser, "User Registed Successfully")
     )

}})

const loginUser = asyncHandler(async (req,res) => {
   // get username and password from req.body
   // validation - not empty
   // check user exists with given username
   // if user not found, throw error
   // if user found, verify password
   // if password not match, throw error
   // if password match, generate access token and refresh token
   // return user details access token and reffresh token in response
   // send cookie in response

   const { username, password} = req.body;

   if(!username || !password) {
      throw new apiError(400, "username and password are required")
   }

   const user = await User.findOne({
      $or: [{ username }, { email }]
   })

   if(!user){
      throw new apiError(404, "user not found with given username or email")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)
   if(!isPasswordValid){
      throw new apiError(401, "Invalid user credentials")
   }

   const {accessToken, refreshToken} = await generateAcessAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const options = {
      httpOnly: true,
      secure: true,
   }

   return res
   .status(200)
   .cookie("acessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
      new apiResponse(
         200,
         {
            user: loggedInUser,
            accessToken,
            refreshToken
         },
         "user logged in successfully"
       )
   )
})

const logoutUser = asyncHandler(async (req, res) => { 
   User.findByIdAndUpdate(
      req.user._id,
      {
         $set: { refreshToken: undefined}
      },
      { new: true}
   )

   const options = {
      httpOnly: true,
      secure: true,
   }

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new apiResponse(200, {}, "user logged out"))
})

export { registerUser,
         loginUser, 
         logoutUser
 };