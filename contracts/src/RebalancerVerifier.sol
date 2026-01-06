// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract RebalancerVerifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 12805770554390495224277077874044769563143068730648820412757455838406430986906;
    uint256 constant alphay  = 8971922258845666713681039261124202733509530182865366893753500214437905076311;
    uint256 constant betax1  = 15489933599537165963316791595116791545388363364498403440967742198293690679119;
    uint256 constant betax2  = 4266869403848835127170973476271775045956885318416486016471313026619647237061;
    uint256 constant betay1  = 7102259354151621606593334296653155694758781666503616498578232778190529197224;
    uint256 constant betay2  = 9055902155166854461502161244511411519475509182139167606602802789561853231538;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 4299899467360554123584123722335733418873665395189243745699948047218273032468;
    uint256 constant deltax2 = 11132937589857970373352037328763264064072801191817312661996426492680800460872;
    uint256 constant deltay1 = 3290519001144430668244184751935999107738638234203267219393310014497201066161;
    uint256 constant deltay2 = 765502264320426126583353593859991844326836048964406012425695451543532287697;

    
    uint256 constant IC0x = 20069592915891447537421672657585270600060262028915628520935343250484275113251;
    uint256 constant IC0y = 19855383679258120976358468973553636253581373955449570503343987520344387497133;
    
    uint256 constant IC1x = 9742202956653151866074659099854386184329658835433067255114691259459290409824;
    uint256 constant IC1y = 9125706611086128699193951194264997866008943952462301883057722639073933275107;
    
    uint256 constant IC2x = 19401605946668079000287047953776405309569975177945390604302841041084093540554;
    uint256 constant IC2y = 6637686081940204949363939595160253441677421676812054418823215871853765461939;
    
    uint256 constant IC3x = 20586214086305989292003231181780308688189737335491235522175541439367370730936;
    uint256 constant IC3y = 4282875097429497477277683339177641182893658393903368220325930770719864366730;
    
    uint256 constant IC4x = 17851536353490508601202137219596470059511975526906837755726047465808139634186;
    uint256 constant IC4y = 15213614230847679460706069788409606793142758454247778674739370500888121398033;
    
    uint256 constant IC5x = 3146866445644482553245911262943844753078355840347769748749154816843210360409;
    uint256 constant IC5y = 8522133381401358767609732889536990782749895166205794120425734732399773030821;
    
    uint256 constant IC6x = 262935386848183432266695085260128328762505682586404962033596260414942401974;
    uint256 constant IC6y = 985475657620097590385346752633621946541984320888204726951568848717315981614;
    
    uint256 constant IC7x = 4379839986467151449627283147920176690813111361482350843484627828868123228278;
    uint256 constant IC7y = 9279966551311709143638617370349916157685664622905738768576742916256915630255;
    
    uint256 constant IC8x = 3515935588773950508326091958179141298173253679896587058106247343415467550111;
    uint256 constant IC8y = 11998207728050607883292517534699533575476893857994438306102996172910278540670;
    
    uint256 constant IC9x = 3680770618206614715658742889850468280908585916393334759672269372196959316388;
    uint256 constant IC9y = 175241785880437336763201154324778832181743883610642101287260026283761466065;
    
    uint256 constant IC10x = 11982756529624225802277043569850823477630697263575152557396401582763101947550;
    uint256 constant IC10y = 14909605999449165437046889503260882919096572717189065129165338391480633218377;
    
    uint256 constant IC11x = 4811609932259665320558419679001758909569587641388697748348072621829324766955;
    uint256 constant IC11y = 16834930945687464869594132486053641554339632791218632475323662838663942523555;
    
    uint256 constant IC12x = 6942255883284062748796071774175117351388518839718205226239079005974770028593;
    uint256 constant IC12y = 11683672188328745157417674684646577184630486339131196813778761847345955072815;
    
    uint256 constant IC13x = 21608381344100213088634683323895201579763622452031139041826552165059395486364;
    uint256 constant IC13y = 10033984567654785159630805600269561450601270301167574930250290259728638591429;
    
    uint256 constant IC14x = 9187505503981537607357919594661990170264235355698163844665611321763538601662;
    uint256 constant IC14y = 9852567649667928937604555706819187994138318237571952325808362214740221833087;
    
    uint256 constant IC15x = 13040509899305047634780733775909964296938450824544881791979961824031958200538;
    uint256 constant IC15y = 12563506356451222978937728483526679681857473418153425065578032956615197794000;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[15] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
