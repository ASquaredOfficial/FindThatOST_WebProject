import React, {useEffect, useState} from 'react';
import { useLocation, useParams } from "react-router-dom";
import { ValidateInputs, AddErrorToFtoInput, AddPlatformInputToPage, RemovePlatformInputFomPage, ListenToPlatformInput } from "./submission";
import './submission.css';

import { Navbar, Footer} from "../../components";
import { IoAdd, IoTrash } from "react-icons/io5";
import { IsEmpty, sortJsonObjectAlphabeticallyExceptLast } from '../../utils/RegularUtils';
import { GetUrlPlatform, GetPlatformIcon, IsFandomImageUrl, IsFandomCommunityWebsiteUrl, GetFandomImageUrlFromFullUrl, IsYoutubeVideoUrl, StandardiseTrackUrl, GetFandomWikiaIcon, GetIdFromYoutubeUrl, GetIdFromTrackUrl } from '../../utils/HyperlinkUtils';
import { useCustomNavigate } from '../../routing/navigation'

const Submit_TrackAdd = () => {
    const { navigateToAnime, navigateToEpisode } = useCustomNavigate();
    const location = useLocation();
    const { anime_id } = useParams();

    const searchParams = new URLSearchParams(location.search);
    const spEpisodeNo = parseInt(searchParams.get('episode_no'), 10) || -1;

    const [ ftoEpisodeID, setFtoEpisodeID ] = useState(-1);
    const [ pageLoading, setPageLoading ] = useState(false);
    const [ pageInputs, setPageInputs ] = useState({});
    const [ userSubmission, setUserSubmission ] = useState({submit_streamPlat: []});
    const [ submissionContextInfo, setSubmissionContextInfo ] = useState();
    const [ platformItems, setPlatformItems ] = useState([{ id: 1, platform: 'non_basic', inputString: '' }]);
    const [ noOfPlatInputsCreated, setNoOfPlatInputsCreated ] = useState(1);
    const [ submitPreExistingTrack, setSubmitPreExistingTrack ] = useState(false);
    const [ successfulSubmitQuery, setSuccessfulSubmitQuery ] = useState();
    const [ charCount_SceneDesc, setCharCount_SceneDesc] = useState('');
    const maxCharCountLength_SceneDesc = 200;
    
    useEffect(() => {
        document.title = `Submit | Add Track | AnimeID(${anime_id}) and EpisodeNo(${spEpisodeNo})`;
        console.log(`Render-Submit_TrackAdd (onMount): ${window.location.href}\nAnimeID:${anime_id}\nEpisodeNo:${spEpisodeNo}`);

        // Fetch page data for anime and corresponding epsiode
        FetchPageData(anime_id, spEpisodeNo);
    }, []);

    useEffect(() => {
        let ftoPageElem = document.getElementById('fto__page');
        let listOfClassNames = ftoPageElem.className.split(" ");
        if (pageLoading === true) {
            // if page doesn't have the class, add loading class
            if (listOfClassNames.indexOf('fto_loading-cursor') === -1) {
                listOfClassNames.unshift('fto_loading-cursor');
                ftoPageElem.className =  listOfClassNames.join(' ').trim();
            }
        }
        else {
            // if page does have the class, remove loading
            if (listOfClassNames.indexOf('fto_loading-cursor') !== -1) {
                let classNameIndex = Number(listOfClassNames.findIndex(item => item === "fto_loading-cursor"));
                listOfClassNames.splice(classNameIndex, 1);
                ftoPageElem.className = listOfClassNames.join(' ').trim();
            }
        }
    }, [pageLoading]);

    useEffect(() => {
        if (submissionContextInfo !== undefined) {
            if (submissionContextInfo.hasOwnProperty('episode_id')) {
                setFtoEpisodeID(submissionContextInfo.episode_id);
            }
            setPageFormValues();
        }
    }, [submissionContextInfo]);

    /**
     * Perform all fetches to set up the webpage.
     * 
     * @async
     * @function FetchPageData
     * @param {number|string}  nAnimeID - Page/Anime ID from url, corresponds to FindThatOST Anime ID.
     * @param {number|string}  nEpisodeNo -  Episode No track is being added to. -1 if added to no specific episode.
     * 
     */
    const FetchPageData = async (nAnimeID, nEpisodeNo = -1) => {
        try {
            // Fetch data from the backend
            const contextDataFromBackend = await FetchSubmissionContextDetails_FTO(nAnimeID, nEpisodeNo);
            console.log('Context Data from backend:', contextDataFromBackend[0]);
            setSubmissionContextInfo(contextDataFromBackend[0]);
        } catch (error) {
            console.error('Error:', error.message);
        }
    }

    /**
     * Get anime details for anime with corresponding FTO Anime ID.
     * 
     * @async
     * @function FetchSubmissionContextDetails_FTO
     * @param {number|string}  nAnimeID - Page/Anime ID from url, corresponds to FindThatOST Anime ID.
     * @param {number|string}  nEpisodeNo -  Episode No track is being added to. -1 if added to no specific episode.
     * @returns {Promise<Array<JSON>>|undefined} The array of json objects (max length 1) containing anime details.
     * 
     */
    const FetchSubmissionContextDetails_FTO = async (nAnimeID, nEpisodeNo) => {
        try {
            let apiUrl_fto = `/findthatost_api/getSubmissionContext/track_add/${Number(nAnimeID)}`;
            if (nEpisodeNo !== -1) {
                apiUrl_fto += `/episode_no/${Number(nEpisodeNo)}`
            }
            console.debug(`Fetch data from the backend, url: '${process.env.REACT_APP_FTO_BACKEND_URL}${apiUrl_fto}'`);
            const response = await fetch(apiUrl_fto);
            if (response.status === 204) {
                // TODO - Page doesn't exist, redirect to page doesnt exist page
                console.error("Response status:", response.status, "\nLikely page doesn't exist. Redirecting to page.")
            }
            const data = await response.json();
            return data;
        } catch (error) {
            throw new Error('Error fetching data from backend.');
        }
    }

    /**
     * Handle Add Platform Input onClick.
     * @function handleAddPlatform
     * @returns {undefined} 
     * 
     */
    const handleAddPlatform = () => {
        AddPlatformInputToPage({setPlatformItems, setNoOfPlatInputsCreated}, noOfPlatInputsCreated);
    }

    /**
     * Handle Add Platform Input onClick.
     * @function handleRemovePlatform
     * @returns {undefined} 
     * 
     */
    const handleRemovePlatform = (itemId) => {
        RemovePlatformInputFomPage(itemId, {setPlatformItems, setUserSubmission})
    }

    const handleChange_TrackAdd = (event) => {
        let inputElement = HTMLElement;
        inputElement = event.target;
        const inputElementName = String(inputElement.name);
        const inputElementValue = inputElement.value;
        setPageInputs(values => ({...values, [inputElementName]: inputElementValue}));
        
        // Validate input, if its in error state
        let listOfClassNames = inputElement.className.split(" ");
        let classNameIndex = Number(listOfClassNames.findIndex(item => item === "fto_input-error"));
        if (classNameIndex > -1) {
            if (inputElementName.startsWith('submit_streamPlat_item_')) {
                //Validate for streaming platform input
                //Only way streamPlat input is error, is becuase duplicate platforms found.

                // Get platform input item id
                const platInputNamePrefix = 'submit_streamPlat_item_';
                const regex = new RegExp(`${platInputNamePrefix}(\\d+)$`);
                const match = regex.exec(inputElementName);
                const platElemId = match ? parseInt(match[1]) : null;

                if (platElemId !== null) {
                    // Get old state of input, before change
                    const foundObject = pageInputs.submit_streamPlat.find(platObj => platObj.id === platElemId);
                    console.debug(`Platform input for element Name${inputElementName} used to be:`, foundObject);

                    const inputDuplucatePlatform = foundObject.platform;
                    if (inputDuplucatePlatform !== 'non_basic') {
                        // Get check if current input is still the same platform
                        if (GetUrlPlatform(inputElementValue) === inputDuplucatePlatform) {
                            // Don't Remove error
                            return;
                        }

                        // Un-error duplicate platform inputs, if no more duplicate platforms
                        const filteredArray = pageInputs.submit_streamPlat.filter(platObj => {
                            return ((platObj.platform === inputDuplucatePlatform) && (platObj.id !== platElemId));
                        });
                        const numberOfObjects = filteredArray.length;
                        if (numberOfObjects < 2) {
                            filteredArray.forEach(platformInputDetails => {
                                console.log(`Duplicate Input:`, platformInputDetails);

                                let submissionFormElems = document.getElementById(`track_add_form`);
                                let inputElem = submissionFormElems[`submit_streamPlat_item_${platformInputDetails.id}`];
                                if (inputElem !== null) {
                                    // Variable still exists, remove error
                                    let inputClassNames = inputElem.className.split(" ");
                                    console.log(`Duplicate Input Element does exists, and has classes:`, inputClassNames);

                                    let errorClassNameIndex = Number(inputClassNames.findIndex(item => item === "fto_input-error"));
                                    inputClassNames.splice(errorClassNameIndex, 1);
                                    inputElem.className = inputClassNames.join(' ').trim();
                                    console.log(`Duplicate Input ID(submit_streamPlat_item_${platformInputDetails.id}) Element New classes:`, inputClassNames);
                                }
                            })
    
                            // Remove error from inputs that aren't duplicate anymore 
                            const listOfPlatformInputs = userSubmission.submit_streamPlat.filter(platObj => {
                                return (platObj.id !== platElemId);
                            });
                            setUserSubmission(prevState => ({...prevState, submit_streamPlat: listOfPlatformInputs}));
                        }
                    }
                }
            }
            else if (!IsEmpty(inputElementValue)) {
                //If input is not empty, check if further validation needed for some specific inputs

                //Further Validation for date input
                if(inputElement.tagName.toLowerCase() === 'input' && inputElement.type === 'date') {
                    //If date is bigger than current date, do not remove error
                    if (new Date(inputElementValue).getTime() > new Date().getTime()) {
                        return;
                    }
                }

                //Further Validation for fandom wikia image url
                if (inputElementName === 'submit_wikiaImgUrl' && !IsFandomImageUrl(inputElementValue)) {
                    return;
                }

                //Further Validation for fandom wikia webpage url
                if (inputElementName === 'submit_wikiaWebpageUrl' && !IsFandomCommunityWebsiteUrl(inputElementValue)) {
                    return;
                }

                //Further Validation for embedded youtube video url
                if (inputElementName === 'submit_embeddedYtUrl' && !IsYoutubeVideoUrl(inputElementValue)) {
                    return;
                } 
            }
            else {
                //If input is empty, check if further validation needed for the specified inputs
                let emptyInputValid = false;
                if (inputElementName === 'submit_wikiaImgUrl') {
                    //Validate for fandom wikia image url
                    emptyInputValid = true;
                }
                else if (inputElementName === 'submit_wikiaWebpageUrl') {
                    //Validate for fandom wikia webpage url
                    emptyInputValid = true;
                }
                else if (inputElementName === 'submit_embeddedYtUrl') {
                    //Validate for fandom wikia webpage url
                    emptyInputValid = true;
                }

                if (!emptyInputValid) {
                    // The input is not allowed to be empty, thus the input invalid 
                    return;
                }
            }

            //Remove error style from Input
            listOfClassNames.splice(classNameIndex, 1);

            //Update input cascade styling (via className)
            event.target.className = listOfClassNames.join(' ').trim();
        }

        // Update character count label
        if (inputElementName === 'submit_sceneDesc') {
            setCharCount_SceneDesc(inputElementValue);
        }
        // Update input platform icon
        else if (inputElementName.startsWith('submit_streamPlat_item_')) {
            // Get platform input item id
            const platInputNamePrefix = 'submit_streamPlat_item_';
            const regex = new RegExp(`${platInputNamePrefix}(\\d+)$`);
            const match = regex.exec(inputElementName);
            const platElemId = match ? parseInt(match[1]) : null;

            ListenToPlatformInput(inputElementValue, platElemId, platformItems, { setPlatformItems });
        }
    }

    const setPageFormValues = () => {
        const trackAddform = document.getElementById('track_add_form');
        trackAddform['submit_trackName'].value = 'My test track';
        trackAddform['submit_songType'].value = 'songType_OP';
        trackAddform['submit_releaseDate'].value = '2023-12-23';
        trackAddform['submit_artistName'].value = 'ASquaredOfficial';
        trackAddform['submit_labelName'].value = 'ASquaredProducer';
        trackAddform['submit_wikiaImgUrl'].value = 'https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/29/SPECIAL_Cover.png/revision/latest/scale-to-width-down/1000?cb=20230806050444';
        trackAddform['submit_wikiaWebpageUrl'].value = 'https://jujutsu-kaisen.fandom.com/wiki/SpecialZ';
        trackAddform['submit_embeddedYtUrl'].value = 'https://www.youtube.com/watch?v=5yb2N3pnztU&pp=ygUTeW91IGFyZSBteSBzcGVjaWFsIA%3D%3D';
        trackAddform['submit_sceneDesc'].value = 'Nanami Sensei';
        setCharCount_SceneDesc(trackAddform['submit_sceneDesc'].value);
        
        const initPlatformItems = [
            { 
                id: 1, platform: 'youtube', 
                inputString: 'https://youtu.be/5RaU8K8sLTM?feature=shared' 
            },
            { 
                id: 2, platform: 'spotify', 
                inputString: 'https://open.spotify.com/track/0GWNtMohuYUEHVZ40tcnHF?si=3a359543d4984116' 
            },
            { 
                id: 3, platform: 'shazam', 
                inputString: 'https://www.shazam.com/track/5933774/dont-speak' 
            },
            { 
                id: 4, platform: 'non_basic', 
                inputString: 'https://deezer.page.link/7eaLrDMjxMiU1Mco8' 
            },
            { 
                id: 5, platform: 'apple_music', 
                inputString: 'https://music.apple.com/gb/album/you-say-run/1127313836?i=1127314187' 
            },
            { 
                id: 6, platform: 'deezer', 
                inputString: 'https://www.deezer.com/us/track/2413426495?host=0&utm_campaign=clipboard-generic&utm_source=user_sharing&utm_content=track-2413426495&deferredFl=1d' 
            },
            { 
                id: 7, platform: 'non_basic', 
                inputString: '', 
            },
            { 
                id: 8, platform: 'amazon_music', 
                inputString: 'https://music.amazon.com.au/albums/B07VZ3WBQ1?trackAsin=B07W164Q6Q' 
            },
        ]

        setPlatformItems(initPlatformItems);
        setNoOfPlatInputsCreated(initPlatformItems.length)
        setPageInputs(values => {
            return {
                ...values, 
                [`submit_trackName`]: trackAddform['submit_trackName'].value,
                [`submit_songType`]: trackAddform['submit_songType'].value,
                [`submit_releaseDate`]: trackAddform['submit_releaseDate'].value,
                [`submit_artistName`]: trackAddform['submit_artistName'].value,
                [`submit_labelName`]: trackAddform['submit_labelName'].value,
                [`submit_wikiaImgUrl`]: trackAddform['submit_wikiaImgUrl'].value,
                [`submit_wikiaWebpageUrl`]: trackAddform['submit_wikiaWebpageUrl'].value,
                [`submit_embeddedYtUrl`]: trackAddform['submit_embeddedYtUrl'].value,
                [`submit_sceneDesc`]: trackAddform['submit_sceneDesc'].value,
                [`submit_streamPlat`]: initPlatformItems,
            }
        });
    }

    /**
     * Perform all fetches to set up the webpage.
     * @async
     * @function FetchPostSubmissionTrackAdd_FTO
     * @param {number|string}  nAnimeID - Page/Anime ID from url, corresponds to FindThatOST Anime ID.
     * @param {number|string}  nEpisodeNo -  Episode No track is being added to. -1 if added to no specific episode.
     * @param {object}  objUserSubmission - Page/Anime ID from url, corresponds to FindThatOST Anime ID.
     * @param {number|string}  nUserId - UserId of logged in user.
     * 
     */
    const FetchPostSubmissionTrackAdd_FTO = async (nAnimeID, nEpisodeNo, objUserSubmission, nUserId = 1) => {
        objUserSubmission['user_id'] = nUserId;
        let apiUrl_fto = `/findthatost_api/postSubmission/track_add/${Number(nAnimeID)}`;
        if (nEpisodeNo !== -1) {
            apiUrl_fto += `/episode_id/${Number(submissionContextInfo.episode_id)}`
        }
        console.debug(`Fetch data from the backend, url: '${process.env.REACT_APP_FTO_BACKEND_URL}${apiUrl_fto}'`);
        const response = await fetch(apiUrl_fto, 
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ objUserSubmission }),
        });

        const responseStatus = response.status;
        const responseData = await response.json();
        if (responseStatus === 200) {    
            console.debug("Response Data:", responseData);
            setSuccessfulSubmitQuery(true);
        } else {
            console.error('Error:', responseData);
            setSuccessfulSubmitQuery(false);
        }
    }

    const handleSubmit_TrackAdd = async (event) => {
        if (successfulSubmitQuery === true) {
            // Successfully added track, unauthorised attempt to submit request
            return;
        }
        event.preventDefault();
        setPageLoading(true);
        
        const formValues = event.target.elements // as HTMLFormControlsCollection;
        let inputsValid = ValidateInputs(formValues, platformItems, {setUserSubmission, setPlatformItems, setPageInputs}, pageInputs, submitPreExistingTrack);
        if (inputsValid) {
            //Format streaming platforms json
            let jsonDataObject = {}
            let listOfNonBasicUrls = [];
            platformItems.forEach(platItem => {
                if (!IsEmpty(platItem.inputString)) {
                    if (platItem.platform !== 'non_basic') {
                        jsonDataObject[platItem.platform] = GetIdFromTrackUrl(platItem.inputString);
                    }
                    else {
                        let nonBasicUrlObj = {};
                        nonBasicUrlObj['url'] = platItem.inputString;
                        listOfNonBasicUrls.push(nonBasicUrlObj);
                    }
                }
            });
            if (listOfNonBasicUrls.length > 0) {
                jsonDataObject.non_basic = listOfNonBasicUrls;
            }
            const jsonSubmission = {data: sortJsonObjectAlphabeticallyExceptLast(jsonDataObject, 'non_basic')};

            // Update userSubmission
            const updatedSubmission = { 
                ...userSubmission, 
                submit_streamPlat: jsonSubmission 
            }; 
            for (const [key, value] of Object.entries(pageInputs)) {
                if (key.startsWith('submit_streamPlat')) {
                    // Skip if the key starts with 'submit_streamPlat'
                    continue;
                }
                else if (key === 'submit_songType') {
                    if (value === 'songType_OP') {
                        updatedSubmission[key] = 'OP';
                    } else if (value === 'songType_ED') {
                        updatedSubmission[key] = 'ED';
                    } else if (value === 'songType_BGM') {
                        updatedSubmission[key] = 'BGM';
                    } else {
                        updatedSubmission[key] = '';
                    }
                }
                else if (key === 'submit_embeddedYtUrl') {
                    updatedSubmission[key] = GetIdFromYoutubeUrl(value);
                }
                else if (key === 'submit_wikiaImgUrl') {
                    updatedSubmission[key] = GetFandomImageUrlFromFullUrl(value);
                }
                else {
                    updatedSubmission[key] = value;
                }
            }
            setUserSubmission(updatedSubmission);
            
            console.debug(`Fetch data:`, updatedSubmission);  
            console.debug(`Fetch data:`, updatedSubmission.submit_wikiaImgUrl);  
            await new Promise(resolve => setTimeout(resolve, 1000));  
            // FetchPostSubmissionTrackAdd_FTO(anime_id, spEpisodeNo, updatedSubmission);
        }
        setPageLoading(false);
    }

    const handleModalOnButtonClick = () => {
        if (successfulSubmitQuery === true) {
            if (ftoEpisodeID !== -1) {
                navigateToEpisode(anime_id, spEpisodeNo);
            }
            else {
                navigateToAnime(anime_id);
            }
        }
        else {
            setSuccessfulSubmitQuery();
        }
    }

    return (
        <div id='fto__page' className='fto__page__submission'>
            {pageLoading && (
                <div className='fto_loading'>
                    <div className='fto_modal_overlay-bg fto_loading-cursor' />
                    <div className={'fto_loading-text_section fto_input'} style={
                            { 
                                position: 'fixed', 
                                top: '50%', 
                                left: '50%', 
                                transform: 'translate(-50%, -50%)', 
                                padding: '20px',
                            }
                        }>
                        <p className={'fto_loading-text fto_unselectable'}>
                            Loading...
                        </p>
                        <div className="fto_loading-loader" />
                    </div>
                </div>
            )}

            <div className='gradient__bg'>
                <Navbar />

                {(submissionContextInfo !== undefined)  && (
                <div className='fto__page__submission-content section__padding'>

                    <div className='fto__page__submission-content_heading_section'>
                        <h1 className='fto__page__submission-content_header_title gradient__text'>
                            Add Track
                            {(spEpisodeNo !== -1) ? (
                                ' to Episode ' + spEpisodeNo
                            ) : (
                                ' to Series'
                            )}
                        </h1>
                        <h4 className='fto__page__submission-content_header_subtitle'><strong>{submissionContextInfo.canonical_title}</strong></h4>
                        <hr className='fto__page__submission-horizontal_hr' />
                    </div>
                    
                    <div className='fto__page__submission-main_content'>
                        <form id='track_add_form' onSubmit={ handleSubmit_TrackAdd }>
                            <div className='fto__page__submission-main_content-input_section'>
                                <label htmlFor='submit_trackName'>Enter Track Name<span className='fto-red__asterisk'>*</span>:</label>
                                <input id='submit_trackName' name='submit_trackName' type='text' className='fto_input' placeholder='Track Name'
                                onChange={ handleChange_TrackAdd }/>
                                <div className='fto__page__submission-main_content-align_end fto__pointer'>
                                    <IoAdd />
                                    <span>
                                        Add track from series archive 
                                    </span>
                                </div>
                            </div>
                            <div className='fto__page__submission-main_content-even_split fto__page__submission-main_content-even_split_gap'>
                                <div className='fto__page__submission-main_content-input_section fto__page__submission-main_content-left'>
                                    <label htmlFor='submit_songType'>Enter Song Type<span className='fto-red__asterisk'>*</span>:</label>
                                    <select id='submit_songType' name='submit_songType' className='fto_input'
                                    onChange={ handleChange_TrackAdd }> 
                                        <option value="" style={{ color : 'gray' }} defaultValue>
                                            -- Select Song Type --
                                        </option>
                                        <option value="songType_OP">
                                            Opening Theme Song
                                        </option>
                                        <option value="songType_ED">
                                            Ending Theme Song
                                        </option>
                                        <option value="songType_BGM">
                                            Background Song
                                        </option>
                                    </select>
                                </div>
                                <div className='fto__page__submission-main_content-input_section fto__page__submission-main_content-right'>
                                    <label htmlFor='submit_releaseDate'>Enter Release Date:</label>
                                    <input id='submit_releaseDate' name='submit_releaseDate' type='date' className='fto_input' max={new Date().toLocaleDateString('fr-ca')}
                                    onChange={ handleChange_TrackAdd }/>
                                </div>
                            </div>
                            <div className='fto__page__submission-main_content-input_section'>
                                <label htmlFor='submit_artistName'>Enter Artist Name:</label>
                                <input id='submit_artistName' name='submit_artistName' type='text' className='fto_input' placeholder='Artist Name'
                                onChange={ handleChange_TrackAdd }/>
                            </div>
                            <div className='fto__page__submission-main_content-input_section'>
                                <label htmlFor='submit_labelName'>Enter Label Name:</label>
                                <input id='submit_labelName' name='submit_labelName' type='text' className='fto_input' placeholder='Label Name'
                                onChange={ handleChange_TrackAdd }/>
                            </div>
                            <div className='fto__page__submission-main_content-input_section'>
                                <label htmlFor='submit_streamPlat'>Add Streaming Platform(s):</label>
                                <div id='fto__page__submission-main_content-streamPlat_items' name='submit_streamPlat'>
                                    {platformItems.map(item => {
                                        return (
                                            <div id={`streamPlat_item_section_`+ item.id} key={item.id}
                                            className='fto__page__submission-main_content-streamPlat_item'>
                                                <div className='delete_streamPlat_item'>
                                                    <IoTrash id={`delete_streamPlat_item_`+ item.id} onClick={() => handleRemovePlatform(item.id)}/>
                                                </div>
                                                <label className='fto-input-drawableIconStart_label'>
                                                    <img src={ GetPlatformIcon( item.platform ) } className='fto-input-drawableIconStart_img' alt='platform_img'/>
                                                    <input id={`submit_streamPlat_item_${item.id}`} name={`submit_streamPlat_item_${item.id}`} type='text' className='fto_input' placeholder='Enter Streaming Platform URL'
                                                    value={ item.inputString }
                                                    onChange={ (ev) => { handleChange_TrackAdd(ev) } }/>
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className='fto__page__submission-main_content-align_end fto__pointer' onClick={handleAddPlatform}>
                                    <span>
                                        Add platform 
                                    </span>
                                    <IoAdd />
                                </div>
                            </div>
                            <div className='fto__page__submission-main_content-input_section'>
                                <label htmlFor='submit_wikiaImgUrl'>Enter Fandom/Wikia Image URL:</label>
                                <label className='fto-input-drawableIconStart_label'>
                                    <img src={ GetFandomWikiaIcon( 'fandom_img', pageInputs.submit_wikiaImgUrl ) } className='fto-input-drawableIconStart_img' alt='platform_img'/>
                                    <input id='submit_wikiaImgUrl' name='submit_wikiaImgUrl' type='text' className='fto_input' 
                                        placeholder='Wikia Image URL' onChange={ handleChange_TrackAdd }/>
                                </label>
                            </div>
                            <div className='fto__page__submission-main_content-input_section'>
                                <label htmlFor='submit_wikiaWebpageUrl'>Enter Fandom/Wikia Webpage URL:</label>
                                <label className='fto-input-drawableIconStart_label'>
                                    <img src={ GetFandomWikiaIcon( 'fandom_web', pageInputs.submit_wikiaWebpageUrl ) } className='fto-input-drawableIconStart_img' alt='platform_img'/>
                                    <input id='submit_wikiaWebpageUrl' name='submit_wikiaWebpageUrl' type='text' className='fto_input'
                                        placeholder='Wikia Webpage URL' onChange={ handleChange_TrackAdd }/>
                                </label>
                            </div>
                            <div className='fto__page__submission-main_content-input_section'>
                                <label htmlFor='submit_embeddedYtUrl'>Enter Embedded YT Video URL:</label>
                                <label className='fto-input-drawableIconStart_label'>
                                    <img src={ GetPlatformIcon( GetUrlPlatform(pageInputs.submit_embeddedYtUrl, 'youtube') ) } className='fto-input-drawableIconStart_img' alt='platform_img'/>
                                    <input id='submit_embeddedYtUrl' name='submit_embeddedYtUrl' type='text' className='fto_input'
                                    plaeholder='Embedded YT Video URL' onChange={ handleChange_TrackAdd }/>
                                </label>
                            </div>
                            <div className='fto__page__submission-main_content-input_section'>
                                <label htmlFor='submit_sceneDesc'>Enter Scene Description:</label>
                                <textarea id='submit_sceneDesc' name='submit_sceneDesc' type='text' className='fto_input'
                                placeholder='Add Scene Description' onChange={ handleChange_TrackAdd }
                                maxLength={ maxCharCountLength_SceneDesc } />
                                <div className='fto__page__submission-main_content-align_end'>
                                    <span>
                                        {charCount_SceneDesc.length}/{maxCharCountLength_SceneDesc} characters
                                    </span>
                                </div>
                            </div>
                            
                            {(successfulSubmitQuery !== true) && (
                            <div className='fto__page__submission-main_content-submit_section'>
                                <button className='fto__button__pink' type='submit' disabled={pageLoading}>
                                    Submit
                                </button>
                                <p className='fto__pointer'>Add to drafts</p>
                            </div>
                            )}
                        </form>
                    </div>
                    
                    {(successfulSubmitQuery !== undefined) && (
                    <div className='fto__page__submission-pop_up'>
                        <div className="fto_modal">
                            <div className="fto_modal-content">
                                {(successfulSubmitQuery === true) ? (
                                    <>
                                        <h3 className='fto__page__submission-content_header_subtitle'>
                                            <strong>Add Track to '{submissionContextInfo.canonical_title}' success!</strong>
                                        </h3>
                                        <button className='fto__button__pink' onClick={ handleModalOnButtonClick }>
                                            Finish
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h3 className='fto__page__submission-content_header_subtitle'>
                                            <strong>An error occurred on submission. Please try again or save this to drafts while we look into this problem.</strong>
                                        </h3>
                                        <button className='fto__button__pink' onClick={ handleModalOnButtonClick }>
                                            Close
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    )}

                </div>
                )}
            </div>
            
            {submissionContextInfo !== undefined && (
		    <Footer />
            )}
        </div>
    )
}

export default Submit_TrackAdd